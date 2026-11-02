const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');

// Công khai: du khách xem danh sách khu vực
router.get('/', categoryController.getAllCategories);

// Chỉ admin đã đăng nhập
router.post('/', verifyToken, requireAdmin, categoryController.createCategory);
router.put('/:id', verifyToken, requireAdmin, categoryController.updateCategory);
router.delete('/:id', verifyToken, requireAdmin, categoryController.deleteCategory);

module.exports = router;
