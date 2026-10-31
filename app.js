const path = require('path');
const express = require('express');
const cors = require('cors');
const adminRoutes = require('./routers/admin.routes');
const artifactRoutes = require('./routers/artifact.routes');
const languageRoutes = require('./routers/language.routes');
const trackRoutes = require('./routers/track.routes');
const categoryRoutes = require('./routers/category.routes'); // Nhúng router quản lý khu vực
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.use(cors());
app.use(express.json());

// Chỉ phục vụ thư mục public/ (chứa file admin.html)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/admin', adminRoutes);
app.use('/api/languages', languageRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/artifacts', artifactRoutes);
app.get('/api/site/qr', (req, res, next) => require('./controllers/artifact.controller').getSiteQr(req, res).catch(next));
app.use('/api/admin/categories', categoryRoutes); // Định tuyến API
// Ép server trả về file admin.html khi truy cập /admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;