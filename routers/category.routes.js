const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');

// Lưu ý: Trong dự án thực tế, bạn cần thêm middleware kiểm tra JWT (admin) vào các route này để bảo mật
router.get('/', categoryController.getAllCategories);
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;