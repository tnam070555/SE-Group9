const mongoose = require('mongoose');

// Mỗi thiết bị (trình duyệt) đang/đã mở trang du khách là một document trong collection "device_sessions".
// deviceId: mã ngẫu nhiên trình duyệt tự tạo và lưu trong localStorage (không phải tài khoản, không chứa thông tin cá nhân).
// Thiết bị được tính là "đang truy cập" khi lastSeen trong 60 giây gần nhất và chưa báo rời trang (disconnectedAt = null).
const deviceSessionSchema = new mongoose.Schema({
    deviceId: { type: String, required: true, unique: true },
    ip: { type: String },          // địa chỉ IP gửi tín hiệu gần nhất
    userAgent: { type: String },   // chuỗi nhận dạng trình duyệt
    deviceType: { type: String },  // Mobile / Tablet / Desktop
    os: { type: String },          // Android / iOS / Windows / macOS / Linux
    browser: { type: String },     // Chrome / Edge / Safari / Firefox / ...
    page: { type: String },        // trang đang mở, ví dụ /detail.html
    firstSeen: { type: Date, required: true },
    lastSeen: { type: Date, required: true },
    disconnectedAt: { type: Date, default: null }, // thời điểm đóng tab (null = chưa rời)
}, { versionKey: false });

// Index trên lastSeen dùng cho cả truy vấn "đang online" lẫn tự xóa:
// tự xóa thiết bị không hoạt động quá 7 ngày để collection không phình to
deviceSessionSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60, name: 'lastSeen_ttl' });

module.exports = mongoose.model('DeviceSession', deviceSessionSchema, 'device_sessions');
