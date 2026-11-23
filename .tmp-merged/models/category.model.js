const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },       // Tên khu vực tiếng Việt (VD: Tầng trệt, Lầu 1)
    slug: {                                                   // Mã khu vực, khớp với categorySlug của công trình. Không đổi sau khi tạo.
        type: String, required: true, unique: true, trim: true, lowercase: true,
        match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Mã khu vực chỉ gồm chữ thường không dấu, số và dấu -'],
    },
    translations: { type: mongoose.Schema.Types.Mixed },      // Tên theo ngôn ngữ: { en: 'Ground floor', ja: '1階' }
    description: { type: String, trim: true },                // Mô tả ngắn gọn
    icon: { type: String, trim: true },                       // Biểu tượng Font Awesome (VD: fa-stairs)
    image: { type: String, trim: true },                      // Link ảnh minh họa (nếu có)
    isActive: { type: Boolean, default: true },               // Tắt: ẩn khu vực và các công trình bên trong khỏi trang du khách
    order: { type: Number, default: 0 },                      // Thứ tự hiển thị (tầng trệt -> lầu -> ...)
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
