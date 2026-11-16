const Language = require('../models/language.model');

// Lớp 3: chỉ truy vấn database
// Thêm ngôn ngữ nếu chưa có, cập nhật tên và mã giọng đọc nếu đã có (không đụng tới isActive)
function upsert({ code, name, speech }) {
    return Language.updateOne({ code }, { $set: { name, speech }, $setOnInsert: { isActive: true } }, { upsert: true });
}

module.exports = { upsert };
