const ticketTypeRepo = require('../repositories/ticketType.repository');
const timeSlotRepo  = require('../repositories/timeSlot.repository');
const orderRepo     = require('../repositories/ticketOrder.repository');

const MAX_PER_ORDER = 10;

// Khung giờ mặc định cho mỗi ngày
const DEFAULT_SLOTS = [
    { from: '07:30', to: '09:00', capacity: 50 },
    { from: '09:00', to: '10:30', capacity: 50 },
    { from: '10:30', to: '12:00', capacity: 50 },
    { from: '13:30', to: '15:00', capacity: 50 },
    { from: '15:00', to: '16:30', capacity: 50 },
];

const ticketService = {
    // -----------------------------------------------------------------
    // Loại vé
    // -----------------------------------------------------------------
    getTicketTypes: async () => {
        return ticketTypeRepo.findAllActive();
    },

    // -----------------------------------------------------------------
    // Slot theo ngày — tự sinh nếu chưa có
    // -----------------------------------------------------------------
    getSlotsByDate: async (date) => {
        // Kiểm tra định dạng ngày hợp lệ
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            const err = new Error('Ngày không hợp lệ, cần định dạng YYYY-MM-DD');
            err.status = 400;
            throw err;
        }

        // Không cho đặt vé ngày trong quá khứ
        const today = new Date().toISOString().slice(0, 10);
        if (date < today) {
            const err = new Error('Không thể đặt vé cho ngày trong quá khứ');
            err.status = 400;
            throw err;
        }

        // Nếu slot cho ngày này chưa có thì generate
        const existing = await timeSlotRepo.countByDate(date);
        if (existing === 0) {
            const docs = DEFAULT_SLOTS.map((s) => ({ ...s, date }));
            await timeSlotRepo.insertMany(docs);
        }

        const slots = await timeSlotRepo.findByDate(date);
        // Trả về dạng plain object kèm available
        return slots.map((s) => ({
            from:      s.from,
            to:        s.to,
            capacity:  s.capacity,
            booked:    s.booked,
            available: s.capacity - s.booked,
        }));
    },

    // -----------------------------------------------------------------
    // Đặt vé
    // -----------------------------------------------------------------
    createOrder: async (body) => {
        const { date, slot, items, contact } = body;

        // --- Validate đầu vào ---
        if (!date || !slot?.from || !slot?.to || !Array.isArray(items) || items.length === 0) {
            const err = new Error('Thiếu thông tin đặt vé (date, slot, items)');
            err.status = 400;
            throw err;
        }

        // Tổng số vé không quá MAX_PER_ORDER
        const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
        if (totalQty < 1 || totalQty > MAX_PER_ORDER) {
            const err = new Error(`Số lượng vé phải từ 1 đến ${MAX_PER_ORDER}`);
            err.status = 400;
            throw err;
        }

        // Kiểm tra slot còn đủ chỗ
        const slotDoc = await timeSlotRepo.findOne(date, slot.from);
        if (!slotDoc) {
            // Slot chưa tồn tại → tạo mới từ DEFAULT_SLOTS
            const template = DEFAULT_SLOTS.find((s) => s.from === slot.from);
            if (!template || template.to !== slot.to) {
                const err = new Error('Khung giờ không hợp lệ');
                err.status = 400;
                throw err;
            }
            await timeSlotRepo.insertMany([{ ...template, date }]);
        } else if (slotDoc.capacity - slotDoc.booked < totalQty) {
            const err = new Error('Khung giờ này không còn đủ chỗ');
            err.status = 409;
            throw err;
        }

        // --- Lấy giá từng loại vé ---
        const typeDocs = await ticketTypeRepo.findAllActive();
        const priceMap = {};
        typeDocs.forEach((t) => { priceMap[t.code] = t.price; });

        let totalPrice = 0;
        const orderItems = [];
        for (const item of items) {
            const price = priceMap[item.type] ?? 0;
            totalPrice += price * item.quantity;
            orderItems.push({ type: item.type, quantity: item.quantity, price });
        }

        // --- Sinh mã vé ---
        const dateTag = date.replace(/-/g, '');
        const tickets = [];
        for (const item of orderItems) {
            for (let i = 0; i < item.quantity; i++) {
                const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
                tickets.push({
                    code:   `TKT-${dateTag}-${rand}`,
                    type:   item.type,
                    status: 'valid',
                });
            }
        }

        // --- Lưu đơn ---
        const order = await orderRepo.create({
            date, slot, items: orderItems, tickets, totalPrice, contact,
        });

        // --- Cập nhật booked (atomic) ---
        await timeSlotRepo.incrementBooked(date, slot.from, totalQty);

        // Trả về danh sách vé kèm QR URL
        const BASE = process.env.CLIENT_URL || 'http://localhost:3000';
        return {
            orderId:    order._id,
            date,
            slot,
            totalPrice,
            tickets: tickets.map((t) => ({
                code:   t.code,
                type:   t.type,
                status: t.status,
                qrUrl:  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${BASE}/tickets.html?code=${t.code}`)}`,
            })),
        };
    },

    // -----------------------------------------------------------------
    // Tra cứu vé theo mã
    // -----------------------------------------------------------------
    getTicketByCode: async (code) => {
        const order = await orderRepo.findByTicketCode(code.toUpperCase());
        if (!order) {
            const err = new Error('Không tìm thấy vé với mã này');
            err.status = 404;
            throw err;
        }
        const ticket = order.tickets.find((t) => t.code === code.toUpperCase());
        const BASE = process.env.CLIENT_URL || 'http://localhost:3000';
        return {
            code:   ticket.code,
            type:   ticket.type,
            status: ticket.status,
            date:   order.date,
            slot:   order.slot,
            qrUrl:  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${BASE}/tickets.html?code=${ticket.code}`)}`,
        };
    },
};

module.exports = ticketService;
