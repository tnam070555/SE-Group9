// Lỗi nghiệp vụ có kèm mã HTTP (400, 401, 404, 409...)
class AppError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

module.exports = AppError;
