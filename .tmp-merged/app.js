const path = require('path');
const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routers/admin.routes');
const artifactRoutes = require('./routers/artifact.routes');
const languageRoutes = require('./routers/language.routes');
const trackRoutes = require('./routers/track.routes');
const categoryRoutes = require('./routers/category.routes'); // Nhúng router quản lý khu vực
const ticketRoutes = require('./routers/ticket.routes');
const categoryController = require('./controllers/category.controller');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
const { getPublicBaseUrl } = require('./utils/network');

const app = express();

app.use(cors());
app.use(express.json());

// Chỉ phục vụ thư mục public/ (chứa file admin.html)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Địa chỉ gốc cho mã QR: PUBLIC_BASE_URL trong .env, không có thì tự lấy IP LAN của máy chạy server
app.get('/api/public-config', (req, res) => {
    const port = req.socket.localPort || process.env.PORT || 5000;
    res.json({ publicBaseUrl: getPublicBaseUrl(port) });
});

app.use('/api/admin', adminRoutes);
app.use('/api/languages', languageRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/artifacts', artifactRoutes);
app.get('/api/site/qr', (req, res, next) => require('./controllers/artifact.controller').getSiteQr(req, res).catch(next));
app.use('/api/admin/categories', categoryRoutes); // Quản lý khu vực (admin)
app.get('/api/categories', categoryController.getPublicCategories); // Khu vực cho trang du khách
// Ép server trả về file admin.html khi truy cập /admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use('/api/tickets', ticketRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;