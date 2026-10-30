const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true }, // Tên khu vực (VD: Tầng trệt, Phòng Khánh tiết)
    description: { type: String }, // Mô tả ngắn gọn
    image: { type: String } // Link ảnh minh họa (nếu có)
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);