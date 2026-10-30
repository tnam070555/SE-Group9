const mongoose = require('mongoose');

const languageSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true }, // Mã ngôn ngữ (VD: 'vi', 'en', 'fr')
    name: { type: String, required: true }, // Tên hiển thị (VD: 'Tiếng Việt', 'English')
    isActive: { type: Boolean, default: true } // Bật/tắt hiển thị trên web
}, { timestamps: true });

module.exports = mongoose.model('Language', languageSchema);