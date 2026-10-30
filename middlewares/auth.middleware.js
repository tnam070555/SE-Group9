const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

// Yêu cầu header: Authorization: Bearer <token>
function verifyToken(req, res, next) {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
        return next(new AppError(401, 'Thiếu token xác thực'));
    }
    try {
        // Không có khóa dự phòng: thiếu JWT_SECRET thì server không khởi động (xem server.js)
        req.admin = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        next(new AppError(401, 'Token không hợp lệ hoặc đã hết hạn'));
    }
}

// Chỉ cho phép vai trò admin
function requireAdmin(req, res, next) {
    if (!req.admin || req.admin.role !== 'admin') {
        return next(new AppError(403, 'Không đủ quyền'));
    }
    next();
}

module.exports = { verifyToken, requireAdmin };
