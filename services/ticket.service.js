const ticketTypeRepo = require('../repositories/ticketType.repository');
const timeSlotRepo  = require('../repositories/timeSlot.repository');
const orderRepo     = require('../repositories/ticketOrder.repository');
const AppError      = require('../utils/AppError');

const MAX_PER_ORDER = 10;   // BR-07: mỗi đơn 1–10 vé
const MAX_DAYS_AHEAD = 60;  // BR-06: chỉ đặt từ hôm nay đến 60 ngày tới

// BR-05: khung giờ mặc định cho mỗi ngày
const DEFAULT_SLOTS = [
    { from: '07:30', to: '09:00', capacity: 50 },
    { from: '09:00', to: '10:30', capacity: 50 },
    { from: '10:30', to: '12:00', capacity: 50 },
    { from: '13:30', to: '15:00', capacity: 50 },
    { from: '15:00', to: '16:30', capacity: 50 },
];

// Ngày theo giờ địa phương của máy chủ, dạng YYYY-MM-DD
function isoDate(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Kiểm tra ngày tham quan: đúng định dạng, có thật, không ở quá khứ, không quá 60 ngày
function validateDate(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new AppError(400, 'Ngày không hợp lệ, cần định dạng YYYY-MM-DD');
    }
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime()) || isoDate(parsed) !== date) {
        throw new AppError(400, 'Ngày không hợp lệ');
    }
    const now = new Date();
    const today = isoDate(now);
    const last = isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + MAX_DAYS_AHEAD));
    if (date < today) throw new AppError(400, 'Không thể đặt vé cho ngày trong quá khứ');
    if (date > last) throw new AppError(400, `Chỉ được đặt vé trong vòng ${MAX_DAYS_AHEAD} ngày tới`);
}

// Tạo 5 khung giờ cho ngày nếu chưa có (bỏ qua lỗi trùng khi hai yêu cầu cùng tạo)
async function ensureSlots(date) {
    if ((await timeSlotRepo.countByDate(date)) > 0) return;
    try {
        await timeSlotRepo.insertMany(DEFAULT_SLOTS.map((s) => ({ ...s, date })));
    } catch (err) {
        if (err.code !== 11000 && !(err.writeErrors || []).every((e) => e.code === 11000)) throw err;
    }
}

// Đường dẫn ảnh QR của vé, trỏ về trang tra cứu vé trên chính máy chủ
function qrUrlOf(code, baseUrl) {
    const link = `${baseUrl}/tickets.html?code=${encodeURIComponent(code)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
}

function randomCode(dateTag) {
    return `TKT-${dateTag}-${Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, '0')}`;
}

const ticketService = {
    DEFAULT_SLOTS,
    MAX_DAYS_AHEAD,

    // Loại vé đang mở bán
    getTicketTypes: async () => ticketTypeRepo.findAllActive(),

    // Khung giờ của một ngày, tự sinh nếu chưa có
    getSlotsByDate: async (date) => {
        validateDate(date);
        await ensureSlots(date);
        const slots = await timeSlotRepo.findByDate(date);
        return slots.map((s) => ({
            from: s.from, to: s.to, capacity: s.capacity, booked: s.booked,
            available: Math.max(0, s.capacity - s.booked),
        }));
    },

    // Đặt vé. baseUrl: địa chỉ gốc máy chủ, dùng cho mã QR trên vé
    createOrder: async (body, baseUrl) => {
        const { date, slot, items, contact } = body || {};

        if (!date || !slot || !slot.from || !slot.to || !Array.isArray(items) || items.length === 0) {
            throw new AppError(400, 'Thiếu thông tin đặt vé (date, slot, items)');
        }
        validateDate(date);

        const template = DEFAULT_SLOTS.find((s) => s.from === slot.from && s.to === slot.to);
        if (!template) throw new AppError(400, 'Khung giờ không hợp lệ');

        // Kiểm tra từng dòng vé: loại vé phải đang mở bán, số lượng là số nguyên dương
        const typeDocs = await ticketTypeRepo.findAllActive();
        const priceMap = new Map(typeDocs.map((t) => [t.code, t.price]));
        const merged = new Map();
        for (const item of items) {
            const type = typeof item?.type === 'string' ? item.type.trim().toUpperCase() : '';
            const quantity = Number(item?.quantity);
            if (!priceMap.has(type)) throw new AppError(400, `Loại vé không hợp lệ: ${item?.type ?? ''}`);
            if (!Number.isInteger(quantity) || quantity < 1) throw new AppError(400, 'Số lượng vé phải là số nguyên dương');
            merged.set(type, (merged.get(type) || 0) + quantity);
        }
        const totalQty = [...merged.values()].reduce((a, b) => a + b, 0);
        if (totalQty < 1 || totalQty > MAX_PER_ORDER) {
            throw new AppError(400, `Số lượng vé phải từ 1 đến ${MAX_PER_ORDER}`);
        }

        // Giữ chỗ nguyên tử: chỉ cộng khi booked + số vé <= capacity (NFR-10)
        await ensureSlots(date);
        const reserved = await timeSlotRepo.reserve(date, slot.from, totalQty);
        if (!reserved) throw new AppError(409, 'Khung giờ này không còn đủ chỗ');

        try {
            // Đơn giá lấy từ máy chủ, không dùng giá trình duyệt gửi lên (BR-07)
            const orderItems = [...merged].map(([type, quantity]) => ({ type, quantity, price: priceMap.get(type) }));
            const totalPrice = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

            const dateTag = date.replace(/-/g, '');
            const used = new Set();
            const tickets = [];
            for (const item of orderItems) {
                for (let i = 0; i < item.quantity; i++) {
                    let code;
                    do { code = randomCode(dateTag); } while (used.has(code));
                    used.add(code);
                    tickets.push({ code, type: item.type, status: 'valid' });
                }
            }

            const cleanContact = contact && typeof contact === 'object' ? {
                name: typeof contact.name === 'string' ? contact.name.trim() : undefined,
                email: typeof contact.email === 'string' ? contact.email.trim() : undefined,
                phone: typeof contact.phone === 'string' ? contact.phone.trim() : undefined,
            } : undefined;

            const order = await orderRepo.create({
                date, slot: { from: template.from, to: template.to }, items: orderItems, tickets, totalPrice, contact: cleanContact,
            });

            return {
                orderId: order._id,
                date,
                slot: { from: template.from, to: template.to },
                totalPrice,
                tickets: tickets.map((t) => ({ ...t, qrUrl: qrUrlOf(t.code, baseUrl) })),
            };
        } catch (err) {
            // Lưu đơn thất bại thì trả lại chỗ đã giữ
            await timeSlotRepo.release(date, slot.from, totalQty).catch(() => {});
            throw err;
        }
    },

    // Tra cứu vé theo mã (không phân biệt hoa thường)
    getTicketByCode: async (code, baseUrl) => {
        const normalized = String(code || '').trim().toUpperCase();
        const order = await orderRepo.findByTicketCode(normalized);
        const ticket = order && order.tickets.find((t) => t.code === normalized);
        if (!ticket) throw new AppError(404, 'Không tìm thấy vé với mã này');
        return {
            code: ticket.code,
            type: ticket.type,
            status: ticket.status,
            date: order.date,
            slot: order.slot,
            qrUrl: qrUrlOf(ticket.code, baseUrl),
        };
    },
};

module.exports = ticketService;
