const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }, // Lưu dạng băm bcrypt, không bao giờ lưu mật khẩu thật
    role: { type: String, default: 'admin' },
    // Lần đổi mật khẩu gần nhất. Mật khẩu hết hạn sau PASSWORD_MAX_AGE_HOURS (mặc định 24 giờ) tính từ mốc này.
    // Tài khoản cũ chưa có trường này thì tính từ createdAt.
    passwordChangedAt: { type: Date },
    // Số lần đăng nhập sai liên tiếp; đủ LOGIN_MAX_ATTEMPTS (mặc định 2) thì khóa tới lockUntil
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
