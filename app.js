const path = require('path');
const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routers/admin.routes');
const artifactRoutes = require('./routers/artifact.routes');
const languageRoutes = require('./routers/language.routes');
const categoryRoutes = require('./routers/category.routes'); // Nhúng router quản lý khu vực
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.use(cors());
app.use(express.json());
// Bộ nhớ tạm lưu thời gian hoạt động cuối cùng của từng IP
const activeUsers = new Map();

// Middleware: Tự động ghi nhận IP mỗi khi có người dùng truy cập web hoặc gọi API
app.use((req, res, next) => {
    // Bỏ qua các request từ chính trang admin để không tự đếm admin vào số lượng khách
    if (!req.path.startsWith('/admin') && !req.path.startsWith('/api/admin')) {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        activeUsers.set(clientIp, Date.now());
    }
    next();
});

// API: Trả về số lượng user đang active (trong 5 phút gần nhất)
app.get('/api/admin/online-users', (req, res) => {
    const NOW = Date.now();
    const TIMEOUT = 5 * 60 * 1000; // 5 phút (tính bằng milliseconds)
    let onlineCount = 0;

    for (const [ip, lastActive] of activeUsers.entries()) {
        if (NOW - lastActive < TIMEOUT) {
            onlineCount++; // Nếu vừa tương tác trong vòng 5 phút -> Tính là Đang Online
        } else {
            activeUsers.delete(ip); // Nếu quá 5 phút -> Xóa khỏi bộ nhớ để giải phóng RAM
        }
    }
    
    res.json({ success: true, count: onlineCount });
});
// Chỉ phục vụ thư mục public/ (chứa file admin.html)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/admin', adminRoutes);
app.use('/api/languages', languageRoutes);
app.use('/api/artifacts', artifactRoutes);
app.use('/api/admin/categories', categoryRoutes); // Định tuyến API
// Ép server trả về file admin.html khi truy cập /admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;