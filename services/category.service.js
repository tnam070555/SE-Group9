// services/category.service.js
const Category = require('../models/category.model');
const AppError = require('../utils/AppError');

class CategoryService {
    async getAll() {
        return await Category.find().sort({ createdAt: 1 });
    }

    async create(data) {
        if (!data.name || typeof data.name !== 'string') {
            throw new AppError(400, 'Tên khu vực là bắt buộc');
        }
        return await Category.create(data);
    }

    async update(id, data) {
        const category = await Category.findByIdAndUpdate(id, data, { new: true });
        if (!category) {
            throw new AppError(404, 'Không tìm thấy khu vực');
        }
        return category;
    }

    async delete(id) {
        const category = await Category.findByIdAndDelete(id);
        if (!category) {
            throw new AppError(404, 'Không tìm thấy khu vực');
        }
        return category;
    }
}

module.exports = new CategoryService();