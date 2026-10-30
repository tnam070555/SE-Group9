const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const statsController = require('../controllers/stats.controller');

// Không có API đăng ký: tài khoản admin được tạo từ ADMIN_USERNAME / ADMIN_PASSWORD khi server khởi động
router.post('/login', adminController.login);

router.get('/stats', verifyToken, requireAdmin, statsController.getStats);
router.get('/stats', verifyToken, requireAdmin, statsController.getStats);
module.exports = router;
