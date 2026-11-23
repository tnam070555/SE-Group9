const artifactRepository = require('../repositories/artifact.repository');
const languageRepository = require('../repositories/language.repository');
const buildings = require('../data/buildings.seed');
const { LANGUAGES } = require('../config/languages');

// Ảnh mặt tiền chung mà bản cũ (fix-images.js) gán cho mọi công trình, không phải ảnh đúng từng phòng
const GENERIC_IMAGES = ['/img/palace-front.jpg', '/img/palace-facade.jpg', '/img/palace-side.jpg'];

// Đồng bộ dữ liệu mẫu (tắt bằng SEED_SAMPLE_DATA=false):
// - Database trống: nạp cả 16 công trình kèm bản dịch.
// - Database đã có dữ liệu: chỉ BỔ SUNG bản dịch còn thiếu cho các công trình mẫu còn nguyên văn bản gốc.
//   Không tạo lại công trình đã bị xóa, không ghi đè bản dịch đã có, không dịch cho văn bản đã bị sửa.
async function syncSampleData() {
    if (process.env.SEED_SAMPLE_DATA === 'false') return { created: 0, updated: 0 };

    if ((await artifactRepository.count()) === 0) {
        await artifactRepository.insertMany(buildings);
        return { created: buildings.length, updated: 0 };
    }

    let updated = 0;
    for (const seed of buildings) {
        const existing = await artifactRepository.findByCode(seed.code);
        if (!existing) continue;
        const plain = typeof existing.toObject === 'function' ? existing.toObject() : existing;

        const set = {};
        const unset = {};
        // Ảnh: bổ sung ảnh đúng phòng cho công trình chưa có ảnh hoặc đang dùng ảnh mặt tiền chung
        // (bản cũ gán chung 3 ảnh mặt tiền cho mọi công trình). Không ghi đè ảnh admin đã tự đặt.
        const generic = !plain.imageUrl || GENERIC_IMAGES.includes(plain.imageUrl);
        if (generic && seed.imageUrl && plain.imageUrl !== seed.imageUrl) set.imageUrl = seed.imageUrl;
        else if (generic && !seed.imageUrl && plain.imageUrl) unset.imageUrl = 1; // chưa có ảnh đúng -> hiện biểu tượng
        // Bổ sung tọa độ bản đồ cho công trình chưa có (không ghi đè tọa độ admin đã chỉnh)
        if (seed.geo && !(plain.geo && Number.isFinite(plain.geo.lat))) set.geo = seed.geo;
        for (const [lang, fields] of Object.entries(seed.translations || {})) {
            for (const [field, value] of Object.entries(fields)) {
                const sourceUnchanged = plain[field] === seed[field];
                const alreadyTranslated = plain.translations && plain.translations[lang] && plain.translations[lang][field];
                if (sourceUnchanged && !alreadyTranslated) set[`translations.${lang}.${field}`] = value;
            }
        }
        if (Object.keys(set).length || Object.keys(unset).length) {
            const update = {};
            if (Object.keys(set).length) update.$set = set;
            if (Object.keys(unset).length) update.$unset = unset;
            await artifactRepository.updateById(existing._id, update);
            updated += 1;
        }
    }
    return { created: 0, updated };
}

// Đồng bộ collection languages theo danh sách ngôn ngữ hỗ trợ trong config/languages.js (nguồn duy nhất)
async function syncLanguages() {
    for (const { code, label, speech } of LANGUAGES) {
        await languageRepository.upsert({ code, name: label, speech });
    }
    return LANGUAGES.length;
}

module.exports = { syncSampleData, syncLanguages };
