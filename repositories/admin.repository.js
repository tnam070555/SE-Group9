const Admin = require('../models/admin.model');

function findByUsername(username) {
    return Admin.findOne({ username });
}

function findById(id) {
    return Admin.findById(id);
}

function create(data) {
    return Admin.create(data);
}

/**
 * Ghi nhận một lần đăng nhập sai. Tăng bộ đếm bằng $inc (atomic) để nhiều request
 * sai cùng lúc vẫn được đếm đủ. Trả về tài khoản sau khi tăng.
 */
function incrementFailedLogin(id) {
    return Admin.findByIdAndUpdate(id, { $inc: { failedLoginAttempts: 1 } }, { returnDocument: 'after' });
}

/** Khóa tài khoản tới thời điểm `until`, đặt lại bộ đếm */
function lock(id, until) {
    return Admin.updateOne({ _id: id }, { $set: { lockUntil: until, failedLoginAttempts: 0 } });
}

/** Đăng nhập đúng hoặc mở khóa: xóa bộ đếm và thời hạn khóa */
function resetLoginState(id) {
    return Admin.updateOne({ _id: id }, { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } });
}

/** Đổi mật khẩu (đã băm) và ghi lại thời điểm đổi */
function updatePassword(id, hashedPassword, changedAt) {
    return Admin.updateOne({ _id: id }, {
        $set: { password: hashedPassword, passwordChangedAt: changedAt, failedLoginAttempts: 0 },
        $unset: { lockUntil: 1 },
    });
}

/** Mở khóa mọi tài khoản (dùng cho lệnh npm run unlock-admin) */
function unlockAll() {
    return Admin.updateMany({}, { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: 1 } });
}

module.exports = { findByUsername, findById, create, incrementFailedLogin, lock, resetLoginState, updatePassword, unlockAll };
