const test = require('node:test');
const assert = require('node:assert');
const artifactRepository = require('../repositories/artifact.repository');
const seedService = require('../services/seed.service');
const buildings = require('../data/buildings.seed');

// Test đọc số lượng từ chính file dữ liệu, nên thêm/bớt công trình không làm test bị lỗi giả.
test.afterEach(() => {
    test.mock.restoreAll();
    delete process.env.SEED_SAMPLE_DATA;
});

test('dữ liệu mẫu: có công trình, mã không trùng và hợp lệ', () => {
    assert.ok(buildings.length > 0, 'file dữ liệu không có công trình nào');
    assert.strictEqual(new Set(buildings.map((b) => b.code)).size, buildings.length, 'có mã trùng');
    for (const b of buildings) {
        assert.match(b.code, /^[A-Z0-9_-]+$/);
        assert.ok(b.name && b.description && b.location, `${b.code} thiếu name/description/location`);
    }
});

test('dữ liệu mẫu: mỗi công trình có đủ bản dịch en, ja, ko, zh', () => {
    for (const b of buildings) {
        for (const lang of ['en', 'ja', 'ko', 'zh']) {
            const t = b.translations && b.translations[lang];
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

test('database trống: nạp toàn bộ công trình kèm bản dịch', async () => {
    let inserted;
    test.mock.method(artifactRepository, 'count', async () => 0);
    test.mock.method(artifactRepository, 'insertMany', async (items) => { inserted = items; });
    assert.deepStrictEqual(await seedService.syncSampleData(), { created: buildings.length, updated: 0 });
    assert.strictEqual(inserted.length, buildings.length);
    assert.ok(inserted[0].translations.ja);
});

test('đã có dữ liệu: bổ sung bản dịch còn thiếu, không tạo lại công trình', async () => {
    const updates = [];
    const insert = test.mock.method(artifactRepository, 'insertMany', async () => {});
    test.mock.method(artifactRepository, 'count', async () => buildings.length);
    // công trình cũ chưa có bản dịch (đã nạp ở phiên bản trước)
    test.mock.method(artifactRepository, 'findByCode', async (code) => {
        const seed = buildings.find((b) => b.code === code);
        return { _id: code, code, name: seed.name, description: seed.description, location: seed.location };
    });
    test.mock.method(artifactRepository, 'updateById', async (id, data) => { updates.push([id, data]); });

    assert.deepStrictEqual(await seedService.syncSampleData(), { created: 0, updated: buildings.length });
    assert.strictEqual(insert.mock.callCount(), 0);
    assert.strictEqual(Object.keys(updates[0][1].$set).length, 14); // 4 ngôn ngữ x 3 trường + ảnh mẫu + tọa độ
    assert.strictEqual(updates[0][1].$set.imageUrl, buildings[0].imageUrl);
    assert.deepStrictEqual(updates[0][1].$set.geo, buildings[0].geo);
});

test('dữ liệu mẫu: mỗi công trình có tọa độ nằm trong khuôn viên Dinh Độc Lập', () => {
    for (const b of buildings) {
        assert.ok(b.geo, `${b.code} thiếu tọa độ geo`);
        // Khuôn viên Dinh (gần đúng): vĩ độ 10.7755–10.7795, kinh độ 106.6935–106.6975
        assert.ok(b.geo.lat > 10.7755 && b.geo.lat < 10.7795, `${b.code} vĩ độ ngoài khuôn viên`);
        assert.ok(b.geo.lng > 106.6935 && b.geo.lng < 106.6975, `${b.code} kinh độ ngoài khuôn viên`);
    }
    const keys = buildings.map((b) => `${b.geo.lat},${b.geo.lng}`);
    assert.strictEqual(new Set(keys).size, keys.length, 'có 2 công trình trùng tọa độ (marker chồng nhau)');
});

test('đã có dữ liệu: không ghi đè tọa độ admin đã chỉnh', async () => {
    const updates = [];
    test.mock.method(artifactRepository, 'count', async () => buildings.length);
    test.mock.method(artifactRepository, 'findByCode', async (code) => {
        const seed = buildings.find((b) => b.code === code);
        return { _id: code, code, name: seed.name, description: seed.description, location: seed.location, geo: { lat: 10.7771, lng: 106.6954 } };
    });
    test.mock.method(artifactRepository, 'updateById', async (id, data) => { updates.push(data.$set); });
    await seedService.syncSampleData();
    assert.ok(updates.length > 0);
    assert.ok(updates.every((s) => !('geo' in s)));
});

test('đã có dữ liệu: không ghi đè ảnh admin đã đặt', async () => {
    const updates = [];
    test.mock.method(artifactRepository, 'count', async () => buildings.length);
    test.mock.method(artifactRepository, 'findByCode', async (code) => {
        const seed = buildings.find((b) => b.code === code);
        return { _id: code, code, name: seed.name, description: seed.description, location: seed.location, imageUrl: 'https://example.com/mine.jpg' };
    });
    test.mock.method(artifactRepository, 'updateById', async (id, data) => { updates.push(data.$set); });
    await seedService.syncSampleData();
    assert.ok(updates.every((s) => !('imageUrl' in s)));
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