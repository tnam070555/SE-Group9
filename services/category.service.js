const Category = require('../models/category.model');
const AppError = require('../utils/AppError');

// Chỉ nhận các trường này từ client (chặn mass assignment)
const ALLOWED_FIELDS = ['name', 'description', 'image'];

function pickFields(data) {
    const picked = {};
    for (const field of ALLOWED_FIELDS) {
        if (data && data[field] !== undefined) picked[field] = data[field];
    }
    return picked;
}

class CategoryService {
    async getAll() {
        return Category.find().sort({ createdAt: 1 });
    }

    async create(data) {
        const picked = pickFields(data);
        if (!picked.name || typeof picked.name !== 'string' || !picked.name.trim()) {
            throw new AppError(400, 'Tên khu vực là bắt buộc');
        }
        picked.name = picked.name.trim();
        return Category.create(picked);
    }

    async update(id, data) {
        const picked = pickFields(data);
        if (Object.keys(picked).length === 0) throw new AppError(400, 'Không có dữ liệu để cập nhật');
        if ('name' in picked) {
            if (typeof picked.name !== 'string' || !picked.name.trim()) {
                throw new AppError(400, 'Tên khu vực không được để trống');
            }
            picked.name = picked.name.trim();
        }
        const category = await Category.findByIdAndUpdate(id, picked, { new: true, runValidators: true });
        if (!category) throw new AppError(404, 'Không tìm thấy khu vực');
        return category;
    }

    async delete(id) {
        const category = await Category.findByIdAndDelete(id);
        if (!category) throw new AppError(404, 'Không tìm thấy khu vực');
        return category;
    }
}

module.exports = new CategoryService();
