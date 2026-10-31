const TicketType = require('../models/ticket_type.model');

const ticketTypeRepository = {
    /** Lấy tất cả loại vé đang kích hoạt */
    findAllActive: () => TicketType.find({ active: true }).sort({ price: 1 }),

    /** Tìm theo mã (code) */
    findByCode: (code) => TicketType.findOne({ code: code.toUpperCase() }),

    /** Tạo mới loại vé (dùng khi seed) */
    create: (data) => TicketType.create(data),

    /** Kiểm tra collection có rỗng không (dùng khi seed) */
    count: () => TicketType.countDocuments(),
};

module.exports = ticketTypeRepository;
