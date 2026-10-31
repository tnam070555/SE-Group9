const categoryService = require('../services/category.service');

// Lớp 1: chỉ lo HTTP. Express 5 tự chuyển lỗi bất đồng bộ sang errorHandler.
class CategoryController {
    async getAllCategories(req, res) {
        const categories = await categoryService.getAll();
        res.status(200).json({ success: true, data: categories });
    }

    async createCategory(req, res) {
        const newCategory = await categoryService.create(req.body);
        res.status(201).json({ success: true, data: newCategory, message: 'Đã thêm thành công' });
    }

    async updateCategory(req, res) {
        const updatedCategory = await categoryService.update(req.params.id, req.body);
        res.status(200).json({ success: true, data: updatedCategory, message: 'Đã cập nhật thành công' });
    }

    async deleteCategory(req, res) {
        await categoryService.delete(req.params.id);
        res.status(200).json({ success: true, message: 'Đã xóa thành công' });
    }
}

module.exports = new CategoryController();
