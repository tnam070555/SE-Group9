const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true }, // Tên sự kiện (VD: Kỷ niệm 30/4)
    description: { type: String }, // Nội dung chi tiết
    startDate: { type: Date }, // Ngày bắt đầu
    endDate: { type: Date }, // Ngày kết thúc
    bannerImage: { type: String }, // Ảnh banner hiển thị trên web
    isActive: { type: Boolean, default: true } // Trạng thái đang diễn ra
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);