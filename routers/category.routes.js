const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');

// Gắn tại /api/admin/categories: chỉ admin đã đăng nhập.
// Du khách xem khu vực qua GET /api/categories (xem app.js)
router.use(verifyToken, requireAdmin);
router.get('/', categoryController.getAllCategories);
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
