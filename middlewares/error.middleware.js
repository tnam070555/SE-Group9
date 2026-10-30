const AppError = require('../utils/AppError');

// Route không tồn tại
function notFound(req, res, next) {
    next(new AppError(404, 'Không tìm thấy đường dẫn'));
}

// Chuyển mọi lỗi thành mã HTTP và thông báo phù hợp
function errorHandler(err, req, res, next) {
    if (err instanceof AppError) {
        return res.status(err.status).json({ success: false, message: err.message });
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'Dữ liệu JSON không hợp lệ' });
    }
    if (err.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'ID không hợp lệ' });
    }
    if (err.name === 'ValidationError') {
        const detail = Object.values(err.errors || {}).map((e) => e.message).join('; ');
        return res.status(400).json({ success: false, message: detail || 'Dữ liệu không hợp lệ' });
    }
    if (err.code === 11000) {
        return res.status(409).json({ success: false, message: 'Mã (code) đã tồn tại' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
}

module.exports = { notFound, errorHandler };
