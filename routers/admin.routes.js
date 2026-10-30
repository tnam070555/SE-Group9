const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// Không có API đăng ký: tài khoản admin được tạo từ ADMIN_USERNAME / ADMIN_PASSWORD khi server khởi động
router.post('/login', adminController.login);

module.exports = router;
