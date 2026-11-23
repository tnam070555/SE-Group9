const crypto = require('crypto');
const QRCode = require('qrcode');
const AppError = require('../utils/AppError');
const { getPublicBaseUrl } = require('../utils/network');
const ticketTypeRepo = require('../repositories/ticketType.repository');
const timeSlotRepo  = require('../repositories/timeSlot.repository');
const orderRepo     = require('../repositories/ticketOrder.repository');

const MAX_PER_ORDER = 10;
const MAX_DAYS_AHEAD = 60;
// Thời gian giữ chỗ chờ thanh toán (phút). Quá hạn → đơn tự hủy, trả lại chỗ.
const PAYMENT_TIMEOUT_MIN = Number(process.env.TICKET_PAYMENT_TIMEOUT_MIN) || 15;
const TIME_ZONE = 'Asia/Ho_Chi_Minh';
// Sau khi thanh toán, trang đơn hàng chỉ hiện vé + QR vào cổng trong ngần này giây.
// Hết thời gian thì phải tra cứu bằng mã vé (khách cần chụp màn hình / ghi lại mã).
const TICKET_VIEW_SECONDS = Number(process.env.TICKET_VIEW_SECONDS) || 60;

// Khung giờ mặc định cho mỗi ngày
const DEFAULT_SLOTS = [
    { from: '07:30', to: '09:00', capacity: 50 },
    { from: '09:00', to: '10:30', capacity: 50 },
    { from: '10:30', to: '12:00', capacity: 50 },
    { from: '13:30', to: '15:00', capacity: 50 },
    { from: '15:00', to: '16:30', capacity: 50 },
];

// Đơn còn giữ chỗ (chưa trả lại chỗ cho khung giờ)
const HOLDING_STATUSES = ['pending', 'paid', 'confirmed'];
const PAID_STATUSES = ['paid', 'confirmed'];

// -----------------------------------------------------------------
// Tiện ích
// -----------------------------------------------------------------

/** Ngày và giờ hiện tại theo giờ Việt Nam: { date: 'YYYY-MM-DD', time: 'HH:MM' } */
function nowInVietnam(now = new Date()) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(now).map((p) => [p.type, p.value])
    );
    return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function addDays(isoDate, n) {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

/** Chuỗi ngẫu nhiên chữ hoa + số, bỏ các ký tự dễ nhầm (0/O, 1/I/L) */
function randomCode(length) {
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const bytes = crypto.randomBytes(length);
    let out = '';
    for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
    return out;
}

/** Kiểm tra ngày tham quan hợp lệ: đúng định dạng, không ở quá khứ, không quá xa */
function assertBookableDate(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
        throw new AppError(400, 'Ngày không hợp lệ, cần định dạng YYYY-MM-DD');
    }
    const today = nowInVietnam().date;
    if (date < today) throw new AppError(400, 'Không thể đặt vé cho ngày trong quá khứ');
    if (date > addDays(today, MAX_DAYS_AHEAD)) {
        throw new AppError(400, `Chỉ nhận đặt vé trong vòng ${MAX_DAYS_AHEAD} ngày tới`);
    }
}

/** Đảm bảo ngày đã có đủ các khung giờ mặc định */
async function ensureSlots(date) {
    if (await timeSlotRepo.countByDate(date) >= DEFAULT_SLOTS.length) return;
    try {
        await timeSlotRepo.insertMany(DEFAULT_SLOTS.map((s) => ({ ...s, date })));
    } catch (err) {
        // Trùng khóa (date, from) = khung giờ đã có sẵn hoặc request khác vừa tạo → bỏ qua
        if (err.code !== 11000 && !(err.writeErrors || []).every((e) => e.code === 11000)) throw err;
    }
}

function publicBaseUrl() {
    return getPublicBaseUrl() || 'http://localhost:' + (process.env.PORT || 5000);
}

/** Mã QR vào cổng của một vé: mở trang tra cứu vé */
function ticketQr(code) {
    return QRCode.toDataURL(`${publicBaseUrl()}/tickets.html?code=${encodeURIComponent(code)}`, { width: 240, margin: 1 });
}

/**
 * Mã QR thanh toán GIẢ LẬP (chỉ để demo, không chuyển tiền thật).
 * Muốn dùng thật thì thay nội dung này bằng chuỗi VietQR của tài khoản ngân hàng.
 */
function paymentQr(order) {
    const content = [
        'DEMO-THANH-TOAN',
        'DINH DOC LAP',
        `MA DON: ${order.orderCode}`,
        `SO TIEN: ${order.totalPrice} VND`,
    ].join('\n');
    return QRCode.toDataURL(content, { width: 280, margin: 1 });
}

/**
 * Số giây còn được xem vé qua link đơn hàng (0 = đã hết).
 * Đơn cũ không có paidAt thì coi như đã hết thời gian xem.
 */
function viewSecondsLeft(order, now = Date.now()) {
    if (!order.paidAt) return 0;
    const ms = new Date(order.paidAt).getTime() + TICKET_VIEW_SECONDS * 1000 - now;
    return Math.max(0, Math.ceil(ms / 1000));
}

/**
 * Dạng trả về cho khách của một đơn. Vé + QR vào cổng chỉ có khi đã thanh toán,
 * và chỉ trong TICKET_VIEW_SECONDS giây đầu sau khi thanh toán.
 */
async function toOrderView(order) {
    const paid = PAID_STATUSES.includes(order.status);
    const secondsLeft = paid ? viewSecondsLeft(order) : 0;
    const view = {
        orderId:    order._id,
        orderCode:  order.orderCode,
        status:     order.status,
        date:       order.date,
        slot:       { from: order.slot.from, to: order.slot.to },
        items:      order.items.map((i) => ({ type: i.type, quantity: i.quantity, price: i.price })),
        totalPrice: order.totalPrice,
        expiresAt:  order.status === 'pending' ? order.expiresAt : null,
        paidAt:     order.paidAt || null,
        tickets:    [],
        payment:    null,
        // Thời gian còn được xem vé (giây). ticketsHidden = đã thanh toán nhưng hết thời gian xem
        viewSecondsLeft: secondsLeft,
        viewSeconds:     TICKET_VIEW_SECONDS,
        ticketsHidden:   paid && secondsLeft === 0,
    };
    if (order.status === 'pending') {
        view.payment = {
            demo:    true,
            amount:  order.totalPrice,
            content: order.orderCode, // nội dung chuyển khoản
            qr:      await paymentQr(order),
        };
    }
    if (paid && secondsLeft > 0) {
        view.tickets = await Promise.all(order.tickets.map(async (t) => ({
            code:   t.code,
            type:   t.type,
            status: t.status,
            date:   order.date,
            slot:   view.slot,
            qr:     await ticketQr(t.code),
        })));
    }
    return view;
}

/** Dạng trả về cho admin (không cần ảnh QR) */
function toAdminView(order) {
    return {
        id:          order._id,
        orderCode:   order.orderCode || '',
        status:      order.status,
        date:        order.date,
        slot:        order.slot,
        items:       order.items,
        quantity:    order.tickets.length,
        totalPrice:  order.totalPrice,
        contact:     order.contact || {},
        expiresAt:   order.expiresAt || null,
        paidAt:      order.paidAt || null,
        cancelledAt: order.cancelledAt || null,
        createdAt:   order.createdAt,
    };
}

/** Trả lại chỗ của một đơn cho khung giờ */
function releaseSeats(order) {
    return timeSlotRepo.release(order.date, order.slot.from, order.tickets.length);
}

// -----------------------------------------------------------------
// Service
// -----------------------------------------------------------------
const ticketService = {
    MAX_PER_ORDER,
    PAYMENT_TIMEOUT_MIN,
    TICKET_VIEW_SECONDS,

    /**
     * Hủy các đơn chờ thanh toán đã quá hạn và trả lại chỗ.
     * Gọi trước mỗi thao tác đọc số chỗ / trạng thái đơn, nên không cần chạy định kỳ.
     */
    expireStaleOrders: async (now = new Date()) => {
        const stale = await orderRepo.findExpiredPending(now);
        for (const order of stale) {
            const updated = await orderRepo.transition(order._id, ['pending'], {
                status: 'expired', cancelledAt: now, 'tickets.$[].status': 'cancelled',
            });
            if (updated) await releaseSeats(updated); // null = admin vừa xác nhận / hủy trước đó
        }
        return stale.length;
    },

    // -----------------------------------------------------------------
    // Loại vé
    // -----------------------------------------------------------------
    getTicketTypes: async () => ticketTypeRepo.findAllActive(),

    // -----------------------------------------------------------------
    // Slot theo ngày — tự sinh nếu chưa có
    // -----------------------------------------------------------------
    getSlotsByDate: async (date) => {
        assertBookableDate(date);
        await ticketService.expireStaleOrders();
        await ensureSlots(date);

        const now = nowInVietnam();
        const slots = await timeSlotRepo.findByDate(date);
        return slots.map((s) => ({
            from:      s.from,
            to:        s.to,
            capacity:  s.capacity,
            booked:    s.booked,
            available: Math.max(0, s.capacity - s.booked),
            passed:    date === now.date && s.from <= now.time,
        }));
    },

    // -----------------------------------------------------------------
    // Đặt vé → đơn ở trạng thái chờ thanh toán, giữ chỗ PAYMENT_TIMEOUT_MIN phút
    // -----------------------------------------------------------------
    createOrder: async (body = {}) => {
        const { date, slot, items, contact } = body;

        // --- Validate đầu vào ---
        if (!date || !slot || !slot.from || !slot.to || !Array.isArray(items) || items.length === 0) {
            throw new AppError(400, 'Thiếu thông tin đặt vé (date, slot, items)');
        }
        assertBookableDate(date);

        const template = DEFAULT_SLOTS.find((s) => s.from === slot.from && s.to === slot.to);
        if (!template) throw new AppError(400, 'Khung giờ không hợp lệ');
        const now = nowInVietnam();
        if (date === now.date && slot.from <= now.time) {
            throw new AppError(400, 'Khung giờ này đã bắt đầu, vui lòng chọn khung giờ khác');
        }

        // Gộp số lượng theo loại vé, chỉ nhận loại vé đang bán và số nguyên dương
        const typeDocs = await ticketTypeRepo.findAllActive();
        const priceMap = new Map(typeDocs.map((t) => [t.code, t.price]));
        const qtyByType = new Map();
        for (const item of items) {
            const type = String((item && item.type) || '').toUpperCase();
            const quantity = item && item.quantity;
            if (!priceMap.has(type)) throw new AppError(400, `Loại vé không hợp lệ: ${type || '(trống)'}`);
            if (!Number.isInteger(quantity) || quantity < 1) {
                throw new AppError(400, 'Số lượng vé phải là số nguyên lớn hơn 0');
            }
            qtyByType.set(type, (qtyByType.get(type) || 0) + quantity);
        }
        const totalQty = [...qtyByType.values()].reduce((a, b) => a + b, 0);
        if (totalQty > MAX_PER_ORDER) {
            throw new AppError(400, `Số lượng vé phải từ 1 đến ${MAX_PER_ORDER}`);
        }

        const orderItems = [...qtyByType].map(([type, quantity]) => ({ type, quantity, price: priceMap.get(type) }));
        const totalPrice = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

        // --- Giữ chỗ (atomic: không thể bán quá sức chứa) ---
        await ticketService.expireStaleOrders();
        await ensureSlots(date);
        const reserved = await timeSlotRepo.reserve(date, slot.from, totalQty);
        if (!reserved) throw new AppError(409, 'Khung giờ này không còn đủ chỗ');

        // --- Sinh mã vé ---
        const dateTag = date.replace(/-/g, '');
        const tickets = [];
        for (const item of orderItems) {
            for (let i = 0; i < item.quantity; i++) {
                tickets.push({ code: `TKT-${dateTag}-${randomCode(6)}`, type: item.type, status: 'pending' });
            }
        }

        // Đơn 0đ (chỉ có vé miễn phí) không cần thanh toán → có hiệu lực ngay
        const free = totalPrice === 0;
        const createdAt = new Date();
        if (free) tickets.forEach((t) => { t.status = 'valid'; });

        const cleanContact = {};
        if (contact && typeof contact === 'object') {
            for (const key of ['name', 'email', 'phone']) {
                if (typeof contact[key] === 'string' && contact[key].trim()) cleanContact[key] = contact[key].trim();
            }
        }

        // --- Lưu đơn. Lỗi thì trả lại chỗ vừa giữ ---
        let order;
        try {
            order = await orderRepo.create({
                orderCode: `DDL${randomCode(7)}`,
                date,
                slot:      { from: template.from, to: template.to },
                items:     orderItems,
                tickets,
                totalPrice,
                status:    free ? 'paid' : 'pending',
                expiresAt: free ? undefined : new Date(createdAt.getTime() + PAYMENT_TIMEOUT_MIN * 60 * 1000),
                paidAt:    free ? createdAt : undefined,
                contact:   cleanContact,
            });
        } catch (err) {
            await timeSlotRepo.release(date, slot.from, totalQty);
            throw err;
        }

        return toOrderView(order);
    },

    // -----------------------------------------------------------------
    // Xem lại đơn (trang thanh toán hỏi định kỳ xem admin đã xác nhận chưa)
    // -----------------------------------------------------------------
    getOrder: async (id) => {
        await ticketService.expireStaleOrders();
        const order = await orderRepo.findById(id);
        if (!order) throw new AppError(404, 'Không tìm thấy đơn đặt vé');
        return toOrderView(order);
    },

    // -----------------------------------------------------------------
    // Tra cứu vé theo mã
    // -----------------------------------------------------------------
    getTicketByCode: async (rawCode) => {
        const code = String(rawCode || '').trim().toUpperCase();
        await ticketService.expireStaleOrders();
        const order = await orderRepo.findByTicketCode(code);
        if (!order) throw new AppError(404, 'Không tìm thấy vé với mã này');

        const ticket = order.tickets.find((t) => t.code === code);
        const paid = PAID_STATUSES.includes(order.status);
        return {
            code:        ticket.code,
            type:        ticket.type,
            status:      ticket.status,
            orderStatus: order.status,
            orderId:     order.status === 'pending' ? order._id : undefined, // để quay lại trang thanh toán
            date:        order.date,
            slot:        { from: order.slot.from, to: order.slot.to },
            qr:          paid ? await ticketQr(ticket.code) : null,
        };
    },

    // -----------------------------------------------------------------
    // Admin
    // -----------------------------------------------------------------
    listOrders: async ({ status, limit, skip } = {}) => {
        await ticketService.expireStaleOrders();
        const filter = {};
        if (status === 'paid') filter.status = { $in: PAID_STATUSES };
        else if (status === 'closed') filter.status = { $in: ['expired', 'cancelled'] };
        else if (status && status !== 'all') filter.status = status;

        const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
        const sk = Math.max(parseInt(skip, 10) || 0, 0);
        const [orders, total, pending] = await Promise.all([
            orderRepo.findAll(filter, lim, sk),
            orderRepo.count(filter),
            orderRepo.count({ status: 'pending' }),
        ]);
        return { orders: orders.map(toAdminView), total, pendingCount: pending };
    },

    /** Admin xác nhận đã nhận được tiền → vé có hiệu lực */
    confirmPayment: async (id) => {
        await ticketService.expireStaleOrders();
        const order = await orderRepo.transition(id, ['pending'], {
            status: 'paid', paidAt: new Date(), 'tickets.$[].status': 'valid',
        });
        if (!order) {
            const current = await orderRepo.findById(id);
            if (!current) throw new AppError(404, 'Không tìm thấy đơn đặt vé');
            const reason = {
                paid: 'Đơn này đã được xác nhận thanh toán rồi',
                confirmed: 'Đơn này đã được xác nhận thanh toán rồi',
                expired: 'Đơn đã quá hạn thanh toán và bị hủy, chỗ đã được trả lại',
                cancelled: 'Đơn đã bị hủy',
            }[current.status] || 'Không thể xác nhận đơn ở trạng thái hiện tại';
            throw new AppError(409, reason);
        }
        return toAdminView(order);
    },

    /** Admin hủy đơn (chưa thanh toán, hoặc đã thanh toán nhưng hoàn tiền) → trả lại chỗ */
    cancelOrder: async (id) => {
        const order = await orderRepo.transition(id, HOLDING_STATUSES, {
            status: 'cancelled', cancelledAt: new Date(), 'tickets.$[].status': 'cancelled',
        });
        if (!order) {
            const current = await orderRepo.findById(id);
            if (!current) throw new AppError(404, 'Không tìm thấy đơn đặt vé');
            throw new AppError(409, 'Đơn đã bị hủy hoặc hết hạn trước đó');
        }
        await releaseSeats(order);
        return toAdminView(order);
    },
};

module.exports = ticketService;
module.exports._internal = { nowInVietnam, DEFAULT_SLOTS };
