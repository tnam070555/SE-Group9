const test = require('node:test');
const assert = require('node:assert');
const artifactRepository = require('../repositories/artifact.repository');
const artifactService = require('../services/artifact.service');
const translationService = require('../services/translation.service');

// Giả lập Repository để test Service mà không cần database thật
test.afterEach(() => test.mock.restoreAll());

test('lấy tất cả công trình', async () => {
    test.mock.method(artifactRepository, 'findAll', async () => [{ name: 'A' }]);
    const result = await artifactService.getAll();
    assert.strictEqual(result.length, 1);
});

test('lấy theo id không tồn tại thì lỗi 404', async () => {
    test.mock.method(artifactRepository, 'findById', async () => null);
    await assert.rejects(() => artifactService.getById('x'), (err) => err.status === 404);
});

test('lấy theo code: tự viết hoa và cắt khoảng trắng', async () => {
    let received;
    test.mock.method(artifactRepository, 'findByCode', async (code) => { received = code; return { code }; });
    await artifactService.getByCode('  ddl-01 ');
    assert.strictEqual(received, 'DDL-01');
});

test('lấy theo code không tồn tại thì lỗi 404', async () => {
    test.mock.method(artifactRepository, 'findByCode', async () => null);
    await assert.rejects(() => artifactService.getByCode('ZZZ'), (err) => err.status === 404);
});

test('tạo thiếu tên thì lỗi 400', async () => {
    await assert.rejects(() => artifactService.create({ code: 'DDL-01' }), (err) => err.status === 400);
});

test('tạo thiếu code thì lỗi 400', async () => {
    await assert.rejects(() => artifactService.create({ name: 'Phòng Khánh Tiết' }), (err) => err.status === 400);
});

test('trường không phải chuỗi thì lỗi 400', async () => {
    await assert.rejects(() => artifactService.create({ name: 123, code: 'X' }), (err) => err.status === 400);
});

test('tạo thành công: cắt khoảng trắng, viết hoa code, bỏ qua trường client tự gán', async () => {
    let saved;
    test.mock.method(artifactRepository, 'create', async (data) => { saved = data; return data; });

    await artifactService.create({ name: '  Phòng Khánh Tiết  ', code: ' ddl-01 ', _id: 'hacker-id', isAdmin: true });

    assert.strictEqual(saved.name, 'Phòng Khánh Tiết');
    assert.strictEqual(saved.code, 'DDL-01');
    assert.strictEqual(saved._id, undefined);
    assert.strictEqual(saved.isAdmin, undefined);
});

test('cập nhật không có dữ liệu hợp lệ thì lỗi 400', async () => {
    await assert.rejects(() => artifactService.update('1', { isAdmin: true }), (err) => err.status === 400);
});

test('cập nhật id không tồn tại thì lỗi 404', async () => {
    test.mock.method(artifactRepository, 'findById', async () => null);
    await assert.rejects(() => artifactService.update('1', { name: 'B' }), (err) => err.status === 404);
});

test('xóa id không tồn tại thì lỗi 404', async () => {
    test.mock.method(artifactRepository, 'deleteById', async () => null);
    await assert.rejects(() => artifactService.delete('1'), (err) => err.status === 404);
});

// ---------- Mã QR ----------
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

test('QR: trả ảnh PNG khi địa chỉ hợp lệ', async () => {
    test.mock.method(artifactRepository, 'findByCode', async () => ({ code: 'DDL-01' }));
    const png = await artifactService.getQrPng('DDL-01', 'http://192.168.1.10:5000');
    assert.ok(Buffer.isBuffer(png));
    assert.ok(png.subarray(0, 4).equals(PNG_SIGNATURE));
});

test('QR: công trình không tồn tại thì lỗi 404', async () => {
    test.mock.method(artifactRepository, 'findByCode', async () => null);
    await assert.rejects(() => artifactService.getQrPng('ZZZ', 'http://localhost:5000'), (err) => err.status === 404);
});

test('QR: địa chỉ không hợp lệ thì lỗi 400', async () => {
    test.mock.method(artifactRepository, 'findByCode', async () => ({ code: 'DDL-01' }));
    await assert.rejects(() => artifactService.getQrPng('DDL-01', 'khong-phai-url'), (err) => err.status === 400);
});

test('QR: chỉ chấp nhận http/https (chặn javascript:, file:...)', async () => {
    test.mock.method(artifactRepository, 'findByCode', async () => ({ code: 'DDL-01' }));
    for (const bad of ['javascript:alert(1)', 'file:///etc/passwd', 'ftp://x.com']) {
        await assert.rejects(() => artifactService.getQrPng('DDL-01', bad), (err) => err.status === 400, bad);
    }
});

// ---------- Đa ngôn ngữ ----------
const sample = {
    _id: '1', code: 'DDL-01', name: 'Phòng Khánh Tiết', description: 'Mô tả VN', location: 'Tầng trệt',
    translations: {
        en: { name: 'Grand Reception Hall', description: 'English text', location: 'Ground floor' },
        ja: { description: '日本語の説明' },
    },
};

test('localize: tiếng Việt trả nguyên văn gốc, liệt kê ngôn ngữ có bản dịch', () => {
    const r = artifactService.localize(sample, 'vi');
    assert.strictEqual(r.name, 'Phòng Khánh Tiết');
    assert.strictEqual(r.language, 'vi');
    assert.strictEqual(r.fallback, false);
    assert.deepStrictEqual(r.availableLanguages, ['vi', 'en', 'ja']);
});

test('localize: có bản dịch thì dùng bản dịch', () => {
    const r = artifactService.localize(sample, 'en');
    assert.strictEqual(r.name, 'Grand Reception Hall');
    assert.strictEqual(r.description, 'English text');
    assert.strictEqual(r.language, 'en');
    assert.strictEqual(r.fallback, false);
});

test('localize: bản dịch thiếu trường thì lấy trường đó từ tiếng Việt', () => {
    const r = artifactService.localize(sample, 'ja');
    assert.strictEqual(r.description, '日本語の説明');
    assert.strictEqual(r.name, 'Phòng Khánh Tiết');
    assert.strictEqual(r.language, 'ja');
});

test('localize: chưa có bản dịch thì trả tiếng Việt và đánh dấu fallback', () => {
    const r = artifactService.localize(sample, 'ko');
    assert.strictEqual(r.description, 'Mô tả VN');
    assert.strictEqual(r.language, 'vi');
    assert.strictEqual(r.fallback, true);
});

test('localize: không lộ toàn bộ translations hay trường nội bộ', () => {
    const r = artifactService.localize({ ...sample, __v: 0, createdAt: 'x' }, 'en');
    assert.strictEqual(r.translations, undefined);
    assert.strictEqual(r.__v, undefined);
});

test('getAll theo ngôn ngữ', async () => {
    test.mock.method(artifactRepository, 'findAll', async () => [sample]);
    const [first] = await artifactService.getAll('en');
    assert.strictEqual(first.name, 'Grand Reception Hall');
});

test('getLocalizedByCode', async () => {
    test.mock.method(artifactRepository, 'findByCode', async () => sample);
    const r = await artifactService.getLocalizedByCode('ddl-01', 'en');
    assert.strictEqual(r.language, 'en');
});

test('sửa mô tả tiếng Việt: xóa bản dịch lỗi thời của đúng trường đó ở mọi ngôn ngữ', async () => {
    let sent;
    test.mock.method(artifactRepository, 'findById', async () => sample);
    test.mock.method(artifactRepository, 'updateById', async (id, data) => { sent = data; return data; });
    await artifactService.update('1', { description: 'Mô tả VN đã sửa', name: 'Phòng Khánh Tiết' });
    assert.deepStrictEqual(Object.keys(sent.$unset).sort(), [
        'translations.en.description', 'translations.ja.description', 'translations.ko.description', 'translations.zh.description',
    ]);
});

test('sửa nhưng nội dung tiếng Việt không đổi thì giữ nguyên bản dịch', async () => {
    let sent;
    test.mock.method(artifactRepository, 'findById', async () => sample);
    test.mock.method(artifactRepository, 'updateById', async (id, data) => { sent = data; return data; });
    await artifactService.update('1', { name: 'Phòng Khánh Tiết', audioUrl: 'x.mp3' });
    assert.strictEqual(sent.$unset, undefined);
});

test('sửa công trình không tồn tại thì lỗi 404', async () => {
    test.mock.method(artifactRepository, 'findById', async () => null);
    await assert.rejects(() => artifactService.update('1', { name: 'B' }), (err) => err.status === 404);
});

test('setTranslation: lưu đúng đường dẫn, cắt khoảng trắng', async () => {
    let sent;
    test.mock.method(artifactRepository, 'updateById', async (id, data) => { sent = data; return data; });
    await artifactService.setTranslation('1', 'ja', { name: '  式典の間 ', description: '説明' });
    assert.deepStrictEqual(sent, { $set: { 'translations.ja.name': '式典の間', 'translations.ja.description': '説明' } });
});

test('setTranslation: ngôn ngữ gốc, ngôn ngữ lạ, thiếu dữ liệu, sai kiểu đều lỗi 400', async () => {
    for (const [lang, body] of [['vi', { name: 'x' }], ['fr', { name: 'x' }], ['en', {}], ['en', undefined], ['en', { name: 5 }]]) {
        await assert.rejects(() => artifactService.setTranslation('1', lang, body), (err) => err.status === 400, `${lang} ${JSON.stringify(body)}`);
    }
});

test('setTranslation: công trình không tồn tại thì lỗi 404', async () => {
    test.mock.method(artifactRepository, 'updateById', async () => null);
    await assert.rejects(() => artifactService.setTranslation('1', 'en', { name: 'x' }), (err) => err.status === 404);
});

test('translate: dịch phần còn thiếu, bỏ qua phần đã có, báo cáo từng ngôn ngữ', async () => {
    let saved;
    test.mock.method(artifactRepository, 'findById', async () => sample);
    test.mock.method(artifactRepository, 'updateById', async (id, data) => { saved = data; return { id }; });
    const calls = [];
    test.mock.method(translationService, 'translateText', async (text, lang) => { calls.push(`${lang}:${text}`); return `${lang}~${text}`; });

    const { report } = await artifactService.translate('1', { languages: ['en', 'ja'] });

    assert.ok(!calls.some((c) => c.startsWith('en:')), 'en đã đủ 3 trường nên không dịch lại');
    assert.deepStrictEqual(calls.sort(), ['ja:Phòng Khánh Tiết', 'ja:Tầng trệt']);
    assert.deepStrictEqual(Object.keys(saved.$set).sort(), ['translations.ja.location', 'translations.ja.name']);
    assert.match(report.en, /bỏ qua/);
    assert.match(report.ja, /2 trường/);
});

test('translate với force dịch lại cả phần đã có', async () => {
    test.mock.method(artifactRepository, 'findById', async () => sample);
    test.mock.method(artifactRepository, 'updateById', async () => ({}));
    const calls = [];
    test.mock.method(translationService, 'translateText', async (text, lang) => { calls.push(lang); return 'x'; });
    await artifactService.translate('1', { languages: ['en'], force: true });
    assert.strictEqual(calls.length, 3);
});

test('translate: một ngôn ngữ lỗi không làm hỏng các ngôn ngữ khác', async () => {
    let saved;
    test.mock.method(artifactRepository, 'findById', async () => ({ code: 'X', name: 'Tên', description: 'Mô tả', location: 'Vị trí' }));
    test.mock.method(artifactRepository, 'updateById', async (id, data) => { saved = data; return {}; });
    test.mock.method(translationService, 'translateText', async (text, lang) => {
        if (lang === 'ko') throw new Error('hết hạn mức');
        return `${lang}~${text}`;
    });
    const { report } = await artifactService.translate('1', { languages: ['en', 'ko'] });
    assert.match(report.ko, /lỗi: hết hạn mức/);
    assert.match(report.en, /3 trường/);
    assert.ok(Object.keys(saved.$set).every((k) => k.startsWith('translations.en.')));
});

test('translate: tất cả đều lỗi thì không ghi database', async () => {
    const update = test.mock.method(artifactRepository, 'updateById', async () => ({}));
    test.mock.method(artifactRepository, 'findById', async () => ({ name: 'Tên', description: 'd', location: 'l' }));
    test.mock.method(translationService, 'translateText', async () => { throw new Error('lỗi mạng'); });
    const { report } = await artifactService.translate('1', { languages: ['en'] });
    assert.match(report.en, /lỗi/);
    assert.strictEqual(update.mock.callCount(), 0);
});

test('translate: languages sai (ngôn ngữ gốc, lạ, rỗng, không phải mảng) thì lỗi 400', async () => {
    test.mock.method(artifactRepository, 'findById', async () => sample);
    for (const languages of [['vi'], ['fr'], [], 'en']) {
        await assert.rejects(() => artifactService.translate('1', { languages }), (err) => err.status === 400, JSON.stringify(languages));
    }
});

test('translate: công trình không tồn tại thì lỗi 404', async () => {
    test.mock.method(artifactRepository, 'findById', async () => null);
    await assert.rejects(() => artifactService.translate('1', {}), (err) => err.status === 404);
});
