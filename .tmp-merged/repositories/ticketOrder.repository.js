const TicketOrder = require('../models/ticket_order.model');

const ticketOrderRepository = {
    /** Tạo đơn đặt vé mới */
    create: (data) => TicketOrder.create(data),

    /** Tìm đơn theo _id */
    findById: (id) => TicketOrder.findById(id),

    /** Tra cứu đơn theo mã vé bất kỳ trong đơn */
    findByTicketCode: (code) =>
        TicketOrder.findOne({ 'tickets.code': code }),

    /** Lấy danh sách đơn (admin), mới nhất trước */
    findAll: (filter = {}, limit = 50, skip = 0) =>
        TicketOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),

    /** Đếm đơn theo điều kiện */
    count: (filter = {}) => TicketOrder.countDocuments(filter),

    /** Các đơn chờ thanh toán đã quá hạn */
    findExpiredPending: (now = new Date()) =>
        TicketOrder.find({ status: 'pending', expiresAt: { $lte: now } }),

    /**
     * Đổi trạng thái đơn chỉ khi đơn đang ở một trong các trạng thái cho phép.
     * Điều kiện nằm trong cùng lệnh update nên hai admin bấm cùng lúc
     * (hoặc admin bấm đúng lúc đơn hết hạn) chỉ một thao tác thành công.
     * Trả về đơn sau khi đổi, hoặc null nếu trạng thái hiện tại không cho phép.
     */
    transition: (id, fromStatuses, set) =>
        TicketOrder.findOneAndUpdate(
            { _id: id, status: { $in: fromStatuses } },
            { $set: set },
            { returnDocument: 'after' }
        ),
};

module.exports = ticketOrderRepository;
