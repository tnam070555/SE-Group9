const Category = require('../models/category.model');
const AppError = require('../utils/AppError');

// 6 khu vực mặc định của Dinh Độc Lập, theo đúng thứ tự tầng (BR-01)
const DEFAULT_AREAS = [
    { slug: 'tang-tret', name: 'Tầng trệt' },
    { slug: 'lau-1', name: 'Lầu 1' },
    { slug: 'lau-2', name: 'Lầu 2' },
    { slug: 'san-thuong', name: 'Sân thượng' },
    { slug: 'tang-ham', name: 'Tầng hầm' },
    { slug: 'ngoai-troi', name: 'Ngoài trời' },
];

// Chỉ nhận các trường này từ client (chặn mass assignment)
const ALLOWED_FIELDS = ['slug', 'name', 'description', 'image'];

// "Tầng sân thượng" -> "tang-san-thuong"
function slugify(text) {
    return String(text || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function pickFields(data) {
    const picked = {};
    for (const field of ALLOWED_FIELDS) {
        if (data && data[field] !== undefined) picked[field] = data[field];
    }
    return picked;
}

function normalizeSlug(picked) {
    if (!('slug' in picked)) return;
    if (typeof picked.slug !== 'string') throw new AppError(400, 'Slug phải là chuỗi');
    picked.slug = slugify(picked.slug);
    if (!picked.slug) throw new AppError(400, 'Slug không hợp lệ');
}

class CategoryService {
    async getAll() {
        const list = await Category.find().lean();
        const order = DEFAULT_AREAS.map((a) => a.slug);
        const rank = (slug) => (order.indexOf(slug) < 0 ? 99 : order.indexOf(slug));
        return list.sort((a, b) => rank(a.slug) - rank(b.slug) || String(a.createdAt).localeCompare(String(b.createdAt)));
    }

    async create(data) {
        const picked = pickFields(data);
        if (!picked.name || typeof picked.name !== 'string' || !picked.name.trim()) {
            throw new AppError(400, 'Tên khu vực là bắt buộc');
        }
        picked.name = picked.name.trim();
        if (!picked.slug) picked.slug = slugify(picked.name);
        normalizeSlug(picked);
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
        normalizeSlug(picked);
        const category = await Category.findByIdAndUpdate(id, picked, { new: true, runValidators: true });
        if (!category) throw new AppError(404, 'Không tìm thấy khu vực');
        return category;
    }

    async delete(id) {
        const category = await Category.findByIdAndDelete(id);
        if (!category) throw new AppError(404, 'Không tìm thấy khu vực');
        return category;
    }

    // Khởi động: CSDL trống thì tạo 6 khu vực mặc định; khu vực cũ thiếu slug thì bổ sung
    async ensureDefaults() {
        if ((await Category.countDocuments()) === 0) {
            await Category.insertMany(DEFAULT_AREAS);
            return { created: DEFAULT_AREAS.length, fixed: 0 };
        }
        const missing = await Category.collection.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] }).toArray();
        let fixed = 0;
        for (const doc of missing) {
            const known = DEFAULT_AREAS.find((a) => slugify(a.name) === slugify(doc.name)
                || slugify(doc.name).endsWith(a.slug));
            let slug = known ? known.slug : slugify(doc.name) || `khu-vuc-${String(doc._id).slice(-6)}`;
            if (await Category.collection.findOne({ slug, _id: { $ne: doc._id } })) slug = `${slug}-${String(doc._id).slice(-4)}`;
            await Category.collection.updateOne({ _id: doc._id }, { $set: { slug } });
            fixed += 1;
        }
        // Tạo lại chỉ mục duy nhất của slug sau khi đã bổ sung đủ
        if (fixed) await Category.syncIndexes().catch((err) => console.error('Lỗi tạo chỉ mục slug:', err.message));
        return { created: 0, fixed };
    }
}

module.exports = new CategoryService();
module.exports.slugify = slugify;
module.exports.DEFAULT_AREAS = DEFAULT_AREAS;
