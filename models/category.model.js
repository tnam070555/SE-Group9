const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    slug: {                                       // Mã khu vực không dấu (VD: tang-tret), công trình tham chiếu qua categorySlug
        type: String, required: true, unique: true, trim: true, lowercase: true,
        match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường không dấu, số và dấu -'],
    },
    name: { type: String, required: true, trim: true }, // Tên khu vực (VD: Tầng trệt)
    description: { type: String },                      // Mô tả ngắn gọn
    image: { type: String },                            // Link ảnh minh họa (nếu có)
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
