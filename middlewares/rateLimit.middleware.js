const AppError = require('../utils/AppError');

// Giới hạn số yêu cầu mỗi địa chỉ IP trong một khoảng thời gian (cửa sổ cố định, lưu trong bộ nhớ)
function rateLimit({ windowMs = 60 * 1000, max = 600 } = {}) {
    const hits = new Map();
    return (req, res, next) => {
        const now = Date.now();
        let entry = hits.get(req.ip);
        if (!entry || now - entry.start >= windowMs) {
            entry = { start: now, count: 0 };
            hits.set(req.ip, entry);
        }
        entry.count += 1;

        if (hits.size > 5000) {
            for (const [ip, e] of hits) if (now - e.start >= windowMs) hits.delete(ip);
        }
        if (entry.count > max) return next(new AppError(429, 'Quá nhiều yêu cầu, vui lòng thử lại sau'));
        next();
    };
}

module.exports = rateLimit;
