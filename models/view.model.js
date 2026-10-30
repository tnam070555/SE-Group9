const mongoose = require('mongoose');

// Mỗi lượt xem / lượt nghe là một bản ghi ẩn danh: chỉ có công trình, ngôn ngữ, loại và thời điểm (không lưu IP, không lưu mã thiết bị)
const viewSchema = new mongoose.Schema({
    code: { type: String, required: true, index: true },
    language: { type: String, required: true },
    type: { type: String, enum: ['view', 'play'], required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

// Tự xóa bản ghi sau 90 ngày
viewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('View', viewSchema);
