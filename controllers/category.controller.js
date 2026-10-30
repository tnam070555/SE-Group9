const categoryService = require('../services/category.service');

const categoryController = {
    getAllCategories: async (req, res) => {
        try {
            const categories = await categoryService.getAll();
            res.status(200).json({ success: true, data: categories });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    createCategory: async (req, res) => {
        try {
            const newCategory = await categoryService.create(req.body);
            res.status(201).json({ success: true, data: newCategory, message: 'Đã thêm thành công' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    updateCategory: async (req, res) => {
        try {
            const updatedCategory = await categoryService.update(req.params.id, req.body);
            res.status(200).json({ success: true, data: updatedCategory, message: 'Đã cập nhật thành công' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    deleteCategory: async (req, res) => {
        try {
            await categoryService.delete(req.params.id);
            res.status(200).json({ success: true, message: 'Đã xóa thành công' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = categoryController;