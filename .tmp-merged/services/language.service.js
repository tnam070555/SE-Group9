const Language = require('../models/language.model');
const Artifact = require('../models/artifact.model');
const AppError = require('../utils/AppError');
const { SOURCE_LANGUAGE, DEFAULT_LANGUAGES, setLanguages, getLanguage } = require('../config/languages');

const CODE_RE = /^[a-z]{2,3}$/;
const TAG_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/; // VD: fr, fr-FR, zh-CN, zh-Hant

function optionalTag(value, field) {
    if (value === undefined) return undefined;
    if (typeof value !== 'string') throw new AppError(400, `Trường ${field} phải là chuỗi`);
    const v = value.trim();
    if (v && !TAG_RE.test(v)) throw new AppError(400, `Trường ${field} không hợp lệ (VD: fr-FR, zh-CN)`);
    return v;
}

// Chỉ nhận các trường được phép, kiểm tra kiểu dữ liệu
function pickFields(data, { creating }) {
    const body = data && typeof data === 'object' ? data : {};
    const picked = {};

    if (creating) {
        if (typeof body.code !== 'string' || !CODE_RE.test(body.code.trim().toLowerCase())) {
            throw new AppError(400, 'Mã ngôn ngữ gồm 2-3 chữ cái (VD: fr, de, th)');
        }
        picked.code = body.code.trim().toLowerCase();
    }
    if (body.name !== undefined) {
        if (typeof body.name !== 'string' || !body.name.trim()) throw new AppError(400, 'Tên ngôn ngữ không được để trống');
        picked.name = body.name.trim();
    } else if (creating) {
        throw new AppError(400, 'Tên ngôn ngữ là bắt buộc');
    }
    const speech = optionalTag(body.speech, 'speech');
    if (speech !== undefined) picked.speech = speech;
    const provider = optionalTag(body.provider, 'provider');
    if (provider !== undefined) picked.provider = provider;
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

function toRegistryItem(doc) {
    return { code: doc.code, label: doc.name, speech: doc.speech, provider: doc.provider, isActive: doc.isActive };
}

class LanguageService {
    // Đọc danh sách từ database vào bộ nhớ (config/languages.js) để mọi module dùng chung
    async reload() {
        const docs = await Language.find().sort({ order: 1, createdAt: 1 }).lean();
        setLanguages(docs.length ? docs.map(toRegistryItem) : DEFAULT_LANGUAGES);
    }

    // Gọi khi server khởi động. Database cũ (chỉ có code + name, thiếu speech/provider) được bổ sung đủ
    // 5 ngôn ngữ mặc định. Database đã ở dạng mới thì giữ nguyên lựa chọn của admin (kể cả ngôn ngữ đã xóa).
    async syncDefaults() {
        const upgraded = await Language.exists({ speech: { $exists: true } });
        if (!upgraded) {
            for (const [index, lang] of DEFAULT_LANGUAGES.entries()) {
                await Language.updateOne(
                    { code: lang.code },
                    {
                        $set: { speech: lang.speech, provider: lang.provider, order: index },
                        $setOnInsert: { name: lang.label, isActive: true },
                    },
                    { upsert: true },
                );
            }
        }
        await this.reload();
    }

    // Danh sách cho trang admin, kèm số công trình đã có bản dịch ở từng ngôn ngữ
    async listForAdmin() {
        const [docs, total] = await Promise.all([
            Language.find().sort({ order: 1, createdAt: 1 }).lean(),
            Artifact.countDocuments(),
        ]);
        const result = [];
        for (const doc of docs) {
            const isSource = doc.code === SOURCE_LANGUAGE;
            const translated = isSource
                ? total
                : await Artifact.countDocuments({ [`translations.${doc.code}.description`]: { $exists: true, $ne: '' } });
            result.push({
                _id: doc._id, code: doc.code, name: doc.name, speech: doc.speech || '', provider: doc.provider || '',
                isActive: isSource ? true : doc.isActive !== false, order: doc.order || 0, isSource,
                translated, totalArtifacts: total,
            });
        }
        return result;
    }

    async create(data) {
        const picked = pickFields(data, { creating: true });
        if (getLanguage(picked.code) || await Language.exists({ code: picked.code })) {
            throw new AppError(409, `Ngôn ngữ "${picked.code}" đã tồn tại`);
        }
        if (!picked.speech) picked.speech = picked.code;
        if (!picked.provider) picked.provider = picked.code;
        if (picked.order === undefined) {
            const last = await Language.findOne().sort({ order: -1 }).lean();
            picked.order = last ? (last.order || 0) + 1 : 0;
        }
        const created = await Language.create(picked);
        await this.reload();
        return created;
    }

    async update(code, data) {
        const picked = pickFields(data, { creating: false });
        if (Object.keys(picked).length === 0) throw new AppError(400, 'Không có dữ liệu để cập nhật');
        if (code === SOURCE_LANGUAGE && picked.isActive === false) {
            throw new AppError(400, 'Không thể tắt ngôn ngữ gốc (Tiếng Việt)');
        }
        const updated = await Language.findOneAndUpdate({ code }, picked, { returnDocument: 'after', runValidators: true });
        if (!updated) throw new AppError(404, 'Không tìm thấy ngôn ngữ');
        await this.reload();
        return updated;
    }

    // Xóa ngôn ngữ và toàn bộ bản dịch của ngôn ngữ đó trong các công trình
    async delete(code) {
        if (code === SOURCE_LANGUAGE) throw new AppError(400, 'Không thể xóa ngôn ngữ gốc (Tiếng Việt)');
        const deleted = await Language.findOneAndDelete({ code });
        if (!deleted) throw new AppError(404, 'Không tìm thấy ngôn ngữ');
        await Artifact.updateMany({ [`translations.${code}`]: { $exists: true } }, { $unset: { [`translations.${code}`]: 1 } });
        await this.reload();
        return deleted;
    }
}

module.exports = new LanguageService();
