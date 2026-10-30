const test = require('node:test');
const assert = require('node:assert');
const artifactRepository = require('../repositories/artifact.repository');
const seedService = require('../services/seed.service');
const buildings = require('../data/buildings.seed');

test.afterEach(() => {
    test.mock.restoreAll();
    delete process.env.SEED_SAMPLE_DATA;
});

test('dữ liệu mẫu: 6 công trình hợp lệ, mỗi công trình có đủ bản dịch en, ja, ko, zh', () => {
    assert.strictEqual(buildings.length, 6);
    assert.strictEqual(new Set(buildings.map((b) => b.code)).size, 6);
    for (const b of buildings) {
        assert.match(b.code, /^[A-Z0-9_-]+$/);
        assert.ok(b.name && b.description && b.location);
        for (const lang of ['en', 'ja', 'ko', 'zh']) {
            const t = b.translations[lang];
            assert.ok(t && t.name && t.description && t.location, `${b.code} thiếu bản dịch ${lang}`);
        }
    }
});

test('bản dịch tiếng Nhật/Hàn/Trung dùng đúng bộ chữ (không lẫn tiếng Việt)', () => {
    const vietnamese = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
    const scripts = { ja: /[\u3040-\u30ff\u4e00-\u9fff]/, ko: /[\uac00-\ud7af]/, zh: /[\u4e00-\u9fff]/ };
    for (const b of buildings) {
        for (const [lang, re] of Object.entries(scripts)) {
            assert.match(b.translations[lang].description, re, `${b.code} ${lang}`);
            assert.ok(!vietnamese.test(b.translations[lang].description), `${b.code} ${lang} còn chữ Việt`);
        }
    }
});

test('database trống: nạp cả 6 công trình kèm bản dịch', async () => {
    let inserted;
    test.mock.method(artifactRepository, 'count', async () => 0);
    test.mock.method(artifactRepository, 'insertMany', async (items) => { inserted = items; });
    assert.deepStrictEqual(await seedService.syncSampleData(), { created: 6, updated: 0 });
    assert.strictEqual(inserted.length, 6);
    assert.ok(inserted[0].translations.ja);
});

test('đã có dữ liệu: bổ sung bản dịch còn thiếu, không tạo lại công trình', async () => {
    const updates = [];
    const insert = test.mock.method(artifactRepository, 'insertMany', async () => {});
    test.mock.method(artifactRepository, 'count', async () => 6);
    // công trình cũ chưa có bản dịch (đã nạp ở phiên bản trước)
    test.mock.method(artifactRepository, 'findByCode', async (code) => {
        const seed = buildings.find((b) => b.code === code);
        return { _id: code, code, name: seed.name, description: seed.description, location: seed.location };
    });
    test.mock.method(artifactRepository, 'updateById', async (id, data) => { updates.push([id, data]); });

    assert.deepStrictEqual(await seedService.syncSampleData(), { created: 0, updated: 6 });
    assert.strictEqual(insert.mock.callCount(), 0);
    assert.strictEqual(Object.keys(updates[0][1].$set).length, 12); // 4 ngôn ngữ x 3 trường
});

test('không ghi đè bản dịch đã có và không dịch cho văn bản đã bị sửa', async () => {
    const seed = buildings[0];
    const updates = [];
    test.mock.method(artifactRepository, 'count', async () => 1);
    test.mock.method(artifactRepository, 'findByCode', async (code) => {
        if (code !== seed.code) return null; // các công trình khác đã bị xóa -> không tạo lại
        return {
            _id: '1', code, name: seed.name, location: seed.location,
            description: 'Mô tả đã bị admin sửa',                                  // gốc đã đổi -> không thêm bản dịch description
            translations: { en: { name: 'Tên EN do admin sửa' } },                 // đã có -> không ghi đè
        };
    });
    test.mock.method(artifactRepository, 'updateById', async (id, data) => { updates.push(data.$set); });

    const result = await seedService.syncSampleData();
    assert.strictEqual(result.updated, 1);
    const set = updates[0];
    assert.strictEqual(set['translations.en.name'], undefined);
    assert.ok(Object.keys(set).every((k) => !k.endsWith('.description')));
    assert.ok(set['translations.ja.name']);
});

test('SEED_SAMPLE_DATA=false thì không làm gì', async () => {
    process.env.SEED_SAMPLE_DATA = 'false';
    const insert = test.mock.method(artifactRepository, 'insertMany', async () => {});
    test.mock.method(artifactRepository, 'count', async () => 0);
    assert.deepStrictEqual(await seedService.syncSampleData(), { created: 0, updated: 0 });
    assert.strictEqual(insert.mock.callCount(), 0);
});
