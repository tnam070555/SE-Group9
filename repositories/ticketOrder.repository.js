const TicketOrder = require('../models/ticket_order.model');

const ticketOrderRepository = {
    /** Tạo đơn đặt vé mới */
    create: (data) => TicketOrder.create(data),

    /** Tra cứu đơn theo mã vé bất kỳ trong đơn */
    findByTicketCode: (code) =>
        TicketOrder.findOne({ 'tickets.code': code }),

    /** Lấy danh sách đơn (admin) */
    findAll: (filter = {}, limit = 50, skip = 0) =>
        TicketOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
};

module.exports = ticketOrderRepository;
