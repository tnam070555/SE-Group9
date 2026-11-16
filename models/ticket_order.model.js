const mongoose = require('mongoose');

/**
 * TicketOrder – một đơn đặt vé, chứa nhiều vé (tickets[]).
 * Mỗi vé có mã riêng dùng cho QR code và tra cứu.
 *
 * Vòng đời đơn:
 *   pending   – vừa đặt, đang giữ chỗ, chờ khách chuyển khoản (hết hạn sau expiresAt)
 *   paid      – admin đã xác nhận nhận được tiền → vé có hiệu lực
 *   expired   – quá hạn mà chưa thanh toán → tự hủy, trả lại chỗ
 *   cancelled – admin hủy → trả lại chỗ
 *   confirmed – trạng thái cũ (trước khi có bước thanh toán), coi như đã thanh toán
 */
const ORDER_STATUSES = ['pending', 'paid', 'expired', 'cancelled', 'confirmed'];
const TICKET_STATUSES = ['pending', 'valid', 'used', 'cancelled'];

const ticketItemSchema = new mongoose.Schema({
    code:   { type: String, required: true },          // Mã vé duy nhất (VD: TKT-20241225-XXXXXX)
    type:   { type: String, required: true },          // TicketType.code
    status: { type: String, enum: TICKET_STATUSES, default: 'pending' },
    usedAt: { type: Date },
}, { _id: false });

const ticketOrderSchema = new mongoose.Schema({
    orderCode: { type: String, required: true },// Mã đơn, dùng làm nội dung chuyển khoản (VD: DDL7K2M9QX)
    date:    { type: String, required: true },   // ISO date
    slot:    {
        from: { type: String, required: true },
        to:   { type: String, required: true },
    },
    items: [{                                    // Số lượng mỗi loại
        type:     { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        price:    { type: Number, required: true, min: 0 },
    }],
    tickets:    [ticketItemSchema],              // Danh sách vé đã phát hành
    totalPrice: { type: Number, default: 0 },
    status:     { type: String, enum: ORDER_STATUSES, default: 'pending' },
    expiresAt:   { type: Date },                 // Hạn thanh toán (chỉ có ý nghĩa khi pending)
    paidAt:      { type: Date },
    cancelledAt: { type: Date },
    // Tuỳ chọn: lưu thông tin người đặt (không bắt buộc đăng nhập)
    contact: {
        name:  { type: String, trim: true, maxlength: 100 },
        email: { type: String, trim: true, lowercase: true, maxlength: 100 },
        phone: { type: String, trim: true, maxlength: 20 },
    },
}, { timestamps: true });

// Tra cứu vé theo mã nhanh, và chặn trùng mã vé giữa các đơn
ticketOrderSchema.index({ 'tickets.code': 1 }, { unique: true });
// sparse: đơn cũ (trước khi có mã đơn) không có orderCode, không được chặn việc tạo index
ticketOrderSchema.index({ orderCode: 1 }, { unique: true, sparse: true });
// Tìm đơn chờ thanh toán đã quá hạn
ticketOrderSchema.index({ status: 1, expiresAt: 1 });

const TicketOrder = mongoose.model('TicketOrder', ticketOrderSchema);
TicketOrder.ORDER_STATUSES = ORDER_STATUSES;

module.exports = TicketOrder;
