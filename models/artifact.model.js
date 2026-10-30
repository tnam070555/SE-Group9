const mongoose = require('mongoose');
const { TARGET_CODES } = require('../config/languages');

// Bản dịch của một công trình sang một ngôn ngữ
const translationSchema = new mongoose.Schema({
    name: { type: String, trim: true },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
}, { _id: false });

// translations: { en: {...}, ja: {...}, ko: {...}, zh: {...} }. Ngôn ngữ ngoài danh sách bị bỏ qua (strict).
const translationsShape = {};
TARGET_CODES.forEach((code) => { translationsShape[code] = translationSchema; });

// Công trình / hiện vật tại Dinh Độc Lập
const artifactSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },                 // Tên công trình (tiếng Việt)
    code: {                                                             // Mã định danh, dùng trong đường dẫn QR (VD: DDL-01)
        type: String, required: true, unique: true, trim: true, uppercase: true,
        match: [/^[A-Z0-9_-]+$/, 'Mã (code) chỉ gồm chữ, số, dấu - và _'],
    },
    description: { type: String },                                      // Nội dung thuyết minh gốc (tiếng Việt)
    location: { type: String },                                         // Vị trí trong Dinh (tầng, khu vực)
    audioUrl: { type: String },                                         // Đường dẫn audio đã lưu (chưa dùng)
    translations: translationsShape,                                    // Bản dịch theo ngôn ngữ
}, { timestamps: true });

module.exports = mongoose.model('Artifact', artifactSchema);
