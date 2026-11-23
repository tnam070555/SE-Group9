const mongoose = require('mongoose');

/**
 * TicketType – loại vé tham quan (người lớn, trẻ em, học sinh/sinh viên, v.v.)
 * Dữ liệu seed được tạo khi server khởi động nếu collection rỗng.
 */
const ticketTypeSchema = new mongoose.Schema({
    code:        { type: String, required: true, unique: true, trim: true, uppercase: true },  // VD: ADULT
    name:        { type: String, required: true, trim: true },   // VD: Người lớn
    description: { type: String, trim: true },                   // VD: Từ 16 tuổi trở lên
    price:       { type: Number, required: true, min: 0, default: 0 }, // VND; 0 = miễn phí
    active:      { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('TicketType', ticketTypeSchema);
