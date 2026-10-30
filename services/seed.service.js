const artifactRepository = require('../repositories/artifact.repository');
const buildings = require('../data/buildings.seed');

// Đồng bộ dữ liệu mẫu (tắt bằng SEED_SAMPLE_DATA=false):
// - Database trống: nạp cả 6 công trình kèm bản dịch.
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
        for (const [lang, fields] of Object.entries(seed.translations || {})) {
            for (const [field, value] of Object.entries(fields)) {
                const sourceUnchanged = plain[field] === seed[field];
                const alreadyTranslated = plain.translations && plain.translations[lang] && plain.translations[lang][field];
                if (sourceUnchanged && !alreadyTranslated) set[`translations.${lang}.${field}`] = value;
            }
        }
        if (Object.keys(set).length) {
            await artifactRepository.updateById(existing._id, { $set: set });
            updated += 1;
        }
    }
    return { created: 0, updated };
}

module.exports = { syncSampleData };
