const mongoose = require('mongoose');

const languageSchema = new mongoose.Schema({
    code: {                                                   // Mã ngôn ngữ ISO (VD: 'vi', 'en', 'fr'), không đổi sau khi tạo
        type: String, required: true, unique: true, trim: true, lowercase: true,
        match: [/^[a-z]{2,3}$/, 'Mã ngôn ngữ gồm 2-3 chữ cái thường (VD: fr, de, th)'],
    },
    name: { type: String, required: true, trim: true },       // Tên hiển thị (VD: 'Tiếng Việt', 'Français')
    speech: { type: String, trim: true },                     // Mã giọng đọc trình duyệt (VD: 'fr-FR')
    provider: { type: String, trim: true },                   // Mã gửi dịch vụ dịch (VD: 'fr', 'zh-CN')
    isActive: { type: Boolean, default: true },               // Bật/tắt hiển thị cho du khách
    order: { type: Number, default: 0 },                      // Thứ tự hiển thị
}, { timestamps: true });

module.exports = mongoose.model('Language', languageSchema);
