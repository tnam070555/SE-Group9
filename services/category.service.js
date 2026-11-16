const Category = require('../models/category.model');
const Artifact = require('../models/artifact.model');
const AppError = require('../utils/AppError');
const DEFAULT_CATEGORIES = require('../data/categories.seed');
const { ALL_CODES, SOURCE_LANGUAGE } = require('../config/languages');

const ICON_RE = /^fa-[a-z0-9-]+$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// "Tầng sân thượng" -> "tang-san-thuong"
function slugify(text) {
    return String(text)
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function optionalString(value, field) {
    if (value === undefined) return undefined;
    if (typeof value !== 'string') throw new AppError(400, `Trường ${field} phải là chuỗi`);
    return value.trim();
}

// Tên khu vực theo từng ngôn ngữ: { en: 'Ground floor' }. Bỏ ngôn ngữ lạ, bỏ ô trống.
function cleanTranslations(value) {
    if (value === undefined) return undefined;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AppError(400, 'translations phải là đối tượng { mã ngôn ngữ: tên }');
    const cleaned = {};
    for (const [lang, name] of Object.entries(value)) {
        if (lang === SOURCE_LANGUAGE || !ALL_CODES.includes(lang)) continue;
        if (typeof name !== 'string') throw new AppError(400, `Tên khu vực (${lang}) phải là chuỗi`);
        if (name.trim()) cleaned[lang] = name.trim();
    }
    return cleaned;
}

// Chỉ nhận các trường được phép (chặn mass assignment). Mã khu vực (slug) chỉ đặt lúc tạo.
function pickFields(data, { creating }) {
    const body = data && typeof data === 'object' ? data : {};
    const picked = {};

    const name = optionalString(body.name, 'name');
    if (name !== undefined) {
        if (!name) throw new AppError(400, 'Tên khu vực không được để trống');
        picked.name = name;
    } else if (creating) {
        throw new AppError(400, 'Tên khu vực là bắt buộc');
    }

    if (creating) {
        const slug = optionalString(body.slug, 'slug') || slugify(picked.name);
        if (!slug || !SLUG_RE.test(slug)) throw new AppError(400, 'Mã khu vực chỉ gồm chữ thường không dấu, số và dấu - (VD: lau-3)');
        picked.slug = slug;
    }

    for (const field of ['description', 'image']) {
        const v = optionalString(body[field], field);
        if (v !== undefined) picked[field] = v;
    }
    const icon = optionalString(body.icon, 'icon');
    if (icon !== undefined) {
        if (icon && !ICON_RE.test(icon)) throw new AppError(400, 'Biểu tượng phải có dạng fa-ten-bieu-tuong (VD: fa-stairs)');
        picked.icon = icon;
    }
    const translations = cleanTranslations(body.translations);
    if (translations !== undefined) picked.translations = translations;
    if (body.isActive !== undefined) {
        if (typeof body.isActive !== 'boolean') throw new AppError(400, 'isActive phải là true hoặc false');
        picked.isActive = body.isActive;
    }
    if (body.order !== undefined) {
        if (!Number.isInteger(body.order)) throw new AppError(400, 'order phải là số nguyên');
        picked.order = body.order;
    }
    return picked;
}

class CategoryService {
    // Gọi khi server khởi động. Database cũ chưa có khu vực nào mang slug thì tạo 6 khu vực mặc định
    // (khớp categorySlug của công trình mẫu) và bỏ các bản ghi cũ không có slug.
    async syncDefaults() {
        if (await Category.exists({ slug: { $exists: true } })) return 0;
        await Category.deleteMany({ slug: { $exists: false } });
        await Category.insertMany(DEFAULT_CATEGORIES);
        return DEFAULT_CATEGORIES.length;
    }

    // Trang admin: tất cả khu vực, kèm số công trình trong từng khu vực
    async getAll() {
        const [categories, counts] = await Promise.all([
            Category.find().sort({ order: 1, createdAt: 1 }).lean(),
            Artifact.aggregate([{ $group: { _id: '$categorySlug', count: { $sum: 1 } } }]),
        ]);
        const countMap = new Map(counts.map((c) => [c._id, c.count]));
        return categories.map((c) => ({ ...c, isActive: c.isActive !== false, artifactCount: countMap.get(c.slug) || 0 }));
    }

    // Trang du khách: chỉ thông tin cần hiển thị
    async getPublic() {
        const categories = await Category.find().sort({ order: 1, createdAt: 1 }).lean();
        return categories.map((c) => ({
            slug: c.slug,
            icon: c.icon || 'fa-layer-group',
            isActive: c.isActive !== false,
            names: { ...(c.translations || {}), [SOURCE_LANGUAGE]: c.name },
        }));
    }

    async existsSlug(slug) {
        return Boolean(await Category.exists({ slug }));
    }

    async create(data) {
        const picked = pickFields(data, { creating: true });
        if (await Category.exists({ slug: picked.slug })) {
            throw new AppError(409, `Mã khu vực "${picked.slug}" đã tồn tại, hãy đặt mã khác`);
        }
        if (picked.order === undefined) {
            const last = await Category.findOne().sort({ order: -1 }).lean();
            picked.order = last ? (last.order || 0) + 1 : 1;
        }
        return Category.create(picked);
    }

    async update(id, data) {
        const picked = pickFields(data, { creating: false });
        if (Object.keys(picked).length === 0) throw new AppError(400, 'Không có dữ liệu để cập nhật');
        const category = await Category.findByIdAndUpdate(id, picked, { returnDocument: 'after', runValidators: true });
        if (!category) throw new AppError(404, 'Không tìm thấy khu vực');
        return category;
    }

    // Không cho xóa khu vực còn công trình, tránh công trình bị mất phân loại
    async delete(id) {
        const category = await Category.findById(id);
        if (!category) throw new AppError(404, 'Không tìm thấy khu vực');
        const used = await Artifact.countDocuments({ categorySlug: category.slug });
        if (used > 0) {
            throw new AppError(409, `Khu vực "${category.name}" đang có ${used} công trình. Hãy chuyển các công trình sang khu vực khác trước khi xóa.`);
        }
        await category.deleteOne();
        return category;
    }
}

module.exports = new CategoryService();
module.exports.slugify = slugify;
