const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const statsController = require('../controllers/stats.controller');
const ticketController = require('../controllers/ticket.controller');
const languageController = require('../controllers/language.controller');

// Không có API đăng ký: tài khoản admin được tạo từ ADMIN_USERNAME / ADMIN_PASSWORD khi server khởi động
router.post('/login', adminController.login);

router.get('/stats', verifyToken, requireAdmin, statsController.getStats);
// Danh sách thiết bị đang truy cập (deviceId, IP, loại thiết bị...) lấy từ collection device_sessions
router.get('/online-devices', verifyToken, requireAdmin, statsController.getOnlineDevices);

// Đơn đặt vé: xem danh sách, xác nhận đã nhận tiền, hủy đơn
router.get('/tickets/orders', verifyToken, requireAdmin, ticketController.listOrders);
router.post('/tickets/orders/:id/confirm', verifyToken, requireAdmin, ticketController.confirmPayment);
router.post('/tickets/orders/:id/cancel', verifyToken, requireAdmin, ticketController.cancelOrder);

// Ngôn ngữ hỗ trợ: thêm, sửa tên/giọng đọc, bật/tắt, xóa (theo mã ngôn ngữ)
router.get('/languages', verifyToken, requireAdmin, languageController.listForAdmin);
router.post('/languages', verifyToken, requireAdmin, languageController.create);
router.put('/languages/:code', verifyToken, requireAdmin, languageController.update);
router.delete('/languages/:code', verifyToken, requireAdmin, languageController.delete);

module.exports = router;
