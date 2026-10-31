const mongoose = require('mongoose');

/**
 * TicketOrder – một đơn đặt vé, chứa nhiều vé (tickets[]).
 * Mỗi vé có mã riêng dùng cho QR code và tra cứu.
 */
const ticketItemSchema = new mongoose.Schema({
    code:   { type: String, required: true, unique: true }, // Mã vé duy nhất (VD: TKT-20241225-XXXXXX)
    type:   { type: String, required: true },               // TicketType.code
    status: { type: String, enum: ['valid', 'used', 'cancelled'], default: 'valid' },
    usedAt: { type: Date },
}, { _id: false });

const ticketOrderSchema = new mongoose.Schema({
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
    status:     { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
    // Tuỳ chọn: lưu thông tin người đặt (không bắt buộc đăng nhập)
    contact: {
        name:  { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        phone: { type: String, trim: true },
    },
}, { timestamps: true });

// Index để tra cứu vé theo mã nhanh
ticketOrderSchema.index({ 'tickets.code': 1 });

module.exports = mongoose.model('TicketOrder', ticketOrderSchema);
