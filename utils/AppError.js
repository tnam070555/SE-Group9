// Lỗi nghiệp vụ có kèm mã HTTP (400, 401, 404, 409...)
// code (tùy chọn): mã máy đọc được để trang web xử lý riêng, VD 'PASSWORD_EXPIRED', 'ACCOUNT_LOCKED'
class AppError extends Error {
    constructor(status, message, code) {
        super(message);
        this.status = status;
        if (code) this.code = code;
    }
}

module.exports = AppError;
