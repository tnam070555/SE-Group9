// Kiểm tra API quản lý Ngôn ngữ, Khu vực và Công trình trên MongoDB trong RAM
const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-secret';
process.env.TRANSLATE_PROVIDER = 'none';

const app = require('../app');
const Language = require('../models/language.model');
const Category = require('../models/category.model');
const Artifact = require('../models/artifact.model');
const languageService = require('../services/language.service');
const categoryService = require('../services/category.service');
const { ALL_CODES } = require('../config/languages');

let mongo;
let server;
let base;
const adminToken = jwt.sign({ id: '1', username: 'admin', role: 'admin' }, 'test-secret', { expiresIn: '1h' });

test.before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await Promise.all([Language.init(), Category.init(), Artifact.init()]);
    // Database "cũ": chỉ có vi, en (thiếu speech/provider) và một khu vực không có slug
    await Language.create([{ code: 'vi', name: 'Tiếng Việt' }, { code: 'en', name: 'English' }]);
    await Category.collection.insertOne({ name: 'Tầng trệt', description: 'cũ' });
    await languageService.syncDefaults();
    await categoryService.syncDefaults();
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    server.close();
    await mongoose.disconnect();
    await mongo.stop();
});

function call(method, path, { token = adminToken, body } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

// ---------- Khởi động: nâng cấp database cũ ----------
test('khởi động: database cũ được bổ sung đủ 5 ngôn ngữ và 6 khu vực mặc định', async () => {
    assert.deepStrictEqual([...ALL_CODES], ['vi', 'en', 'ja', 'ko', 'zh']);
    const en = await Language.findOne({ code: 'en' }).lean();
    assert.strictEqual(en.speech, 'en-US');
    const slugs = (await Category.find().sort({ order: 1 }).lean()).map((c) => c.slug);
    assert.deepStrictEqual(slugs, ['tang-tret', 'lau-1', 'lau-2', 'san-thuong', 'tang-ham', 'ngoai-troi']);
});

test('khởi động lần hai không tạo lại khu vực admin đã xóa', async () => {
    await Category.deleteOne({ slug: 'tang-ham' });
    assert.strictEqual(await categoryService.syncDefaults(), 0);
    assert.strictEqual(await Category.exists({ slug: 'tang-ham' }), null);
});

// ---------- Ngôn ngữ ----------
test('API quản lý ngôn ngữ: không token -> 401', async () => {
    assert.strictEqual((await call('GET', '/api/admin/languages', { token: null })).status, 401);
    assert.strictEqual((await call('POST', '/api/admin/languages', { token: null, body: {} })).status, 401);
});

test('thêm ngôn ngữ mới: dùng được ngay cho bản dịch và trang du khách', async () => {
    const res = await call('POST', '/api/admin/languages', { body: { code: 'FR', name: 'Français', speech: 'fr-FR' } });
    assert.strictEqual(res.status, 201);
    assert.ok(ALL_CODES.includes('fr'));

    const pub = await (await call('GET', '/api/languages', { token: null })).json();
    assert.ok(pub.data.some((l) => l.code === 'fr' && l.speech === 'fr-FR'));

    const artifact = await Artifact.create({ name: 'Phòng A', code: 'T-FR', description: 'mô tả' });
    const put = await call('PUT', `/api/artifacts/${artifact._id}/translations/fr`, { body: { description: 'description FR' } });
    assert.strictEqual(put.status, 200);
    const localized = await (await call('GET', '/api/artifacts/code/T-FR?lang=fr', { token: null })).json();
    assert.strictEqual(localized.data.description, 'description FR');
    assert.strictEqual(localized.data.fallback, false);
});

test('thêm ngôn ngữ: trùng mã -> 409, mã sai -> 400, thiếu tên -> 400', async () => {
    assert.strictEqual((await call('POST', '/api/admin/languages', { body: { code: 'en', name: 'X' } })).status, 409);
    assert.strictEqual((await call('POST', '/api/admin/languages', { body: { code: 'f1', name: 'X' } })).status, 400);
    assert.strictEqual((await call('POST', '/api/admin/languages', { body: { code: 'de' } })).status, 400);
    assert.strictEqual((await call('POST', '/api/admin/languages', { body: { code: 'de', name: 'Deutsch', speech: '<script>' } })).status, 400);
});

test('danh sách admin có tiến độ dịch từng ngôn ngữ', async () => {
    const body = await (await call('GET', '/api/admin/languages')).json();
    const fr = body.data.find((l) => l.code === 'fr');
    assert.strictEqual(fr.translated, 1);
    assert.strictEqual(fr.totalArtifacts, 1);
    assert.strictEqual(body.data.find((l) => l.code === 'vi').isSource, true);
});

test('tắt ngôn ngữ: ẩn khỏi trang du khách nhưng vẫn quản lý được', async () => {
    assert.strictEqual((await call('PUT', '/api/admin/languages/ko', { body: { isActive: false } })).status, 200);
    const pub = await (await call('GET', '/api/languages', { token: null })).json();
    assert.ok(!pub.data.some((l) => l.code === 'ko'));
    const admin = await (await call('GET', '/api/admin/languages')).json();
    assert.strictEqual(admin.data.find((l) => l.code === 'ko').isActive, false);
});

test('không được tắt hoặc xóa tiếng Việt', async () => {
    assert.strictEqual((await call('PUT', '/api/admin/languages/vi', { body: { isActive: false } })).status, 400);
    assert.strictEqual((await call('DELETE', '/api/admin/languages/vi')).status, 400);
});

test('xóa ngôn ngữ: xóa luôn bản dịch của ngôn ngữ đó', async () => {
    assert.strictEqual((await call('DELETE', '/api/admin/languages/fr')).status, 200);
    assert.ok(!ALL_CODES.includes('fr'));
    const doc = await Artifact.findOne({ code: 'T-FR' }).lean();
    assert.strictEqual(doc.translations && doc.translations.fr, undefined);
    assert.strictEqual((await call('DELETE', '/api/admin/languages/fr')).status, 404);
});

// ---------- Khu vực ----------
test('khu vực: GET admin cần token, GET công khai thì không', async () => {
    assert.strictEqual((await call('GET', '/api/admin/categories', { token: null })).status, 401);
    const pub = await (await call('GET', '/api/categories', { token: null })).json();
    const tret = pub.data.find((c) => c.slug === 'tang-tret');
    assert.strictEqual(tret.names.vi, 'Tầng trệt');
    assert.strictEqual(tret.names.en, 'Ground floor');
});

test('thêm khu vực: tự tạo mã từ tên tiếng Việt, lưu tên theo ngôn ngữ', async () => {
    const res = await call('POST', '/api/admin/categories', {
        body: { name: 'Lầu 3 – Phòng Đọc', translations: { en: 'Third floor', xx: 'bỏ' }, icon: 'fa-book' },
    });
    assert.strictEqual(res.status, 201);
    const { data } = await res.json();
    assert.strictEqual(data.slug, 'lau-3-phong-doc');
    assert.deepStrictEqual(data.translations, { en: 'Third floor' });
    assert.strictEqual((await call('POST', '/api/admin/categories', { body: { name: 'Lầu 3 - Phòng đọc' } })).status, 409);
    assert.strictEqual((await call('POST', '/api/admin/categories', { body: { name: 'X', icon: 'evil"><script>' } })).status, 400);
});

test('sửa khu vực không đổi được mã (slug)', async () => {
    const cat = await Category.findOne({ slug: 'lau-1' });
    const res = await call('PUT', `/api/admin/categories/${cat._id}`, { body: { name: 'Lầu một', slug: 'doi-ma', isActive: false } });
    assert.strictEqual(res.status, 200);
    const { data } = await res.json();
    assert.strictEqual(data.slug, 'lau-1');
    assert.strictEqual(data.name, 'Lầu một');
    assert.strictEqual(data.isActive, false);
});

test('không xóa được khu vực còn công trình; hết công trình thì xóa được', async () => {
    const cat = await Category.findOne({ slug: 'lau-2' });
    const artifact = await Artifact.create({ name: 'Phòng B', code: 'T-L2', categorySlug: 'lau-2' });
    const blocked = await call('DELETE', `/api/admin/categories/${cat._id}`);
    assert.strictEqual(blocked.status, 409);

    const list = await (await call('GET', '/api/admin/categories')).json();
    assert.strictEqual(list.data.find((c) => c.slug === 'lau-2').artifactCount, 1);

    await artifact.deleteOne();
    assert.strictEqual((await call('DELETE', `/api/admin/categories/${cat._id}`)).status, 200);
});

// ---------- Công trình: khu vực và ảnh ----------
test('công trình: lưu khu vực và ảnh, trả về imageUrl cho du khách', async () => {
    const res = await call('POST', '/api/artifacts', {
        body: { name: 'Phòng C', code: 't-c', categorySlug: 'tang-tret', imageUrl: 'https://example.com/a.jpg' },
    });
    assert.strictEqual(res.status, 201);
    const pub = await (await call('GET', '/api/artifacts/code/T-C', { token: null })).json();
    assert.strictEqual(pub.data.categorySlug, 'tang-tret');
    assert.strictEqual(pub.data.imageUrl, 'https://example.com/a.jpg');
});

test('công trình: khu vực không tồn tại -> 400; link ảnh nguy hiểm -> 400', async () => {
    assert.strictEqual((await call('POST', '/api/artifacts', { body: { name: 'D', code: 'T-D', categorySlug: 'khong-co' } })).status, 400);
    for (const imageUrl of ['javascript:alert(1)', 'data:image/png;base64,AAA', '//evil.com/a.png']) {
        assert.strictEqual((await call('POST', '/api/artifacts', { body: { name: 'D', code: 'T-D', imageUrl } })).status, 400, imageUrl);
    }
    assert.strictEqual((await call('POST', '/api/artifacts', { body: { name: 'D', code: 'T-D', imageUrl: '/img/images.jpg' } })).status, 201);
});

test('công trình: bỏ khu vực và ảnh bằng chuỗi rỗng', async () => {
    const doc = await Artifact.findOne({ code: 'T-C' });
    const res = await call('PUT', `/api/artifacts/${doc._id}`, { body: { categorySlug: '', imageUrl: '' } });
    assert.strictEqual(res.status, 200);
    const { data } = await res.json();
    assert.strictEqual(data.categorySlug, '');
    assert.strictEqual(data.imageUrl, '');
});

test('công trình: mã QR được lưu vào MongoDB và tạo lại khi đổi mã', async () => {
    const res = await call('POST', '/api/artifacts', { body: { name: 'Phòng QR', code: 'T-QR' } });
    assert.strictEqual(res.status, 201);
    let doc = await Artifact.findOne({ code: 'T-QR' }).lean();
    assert.match(doc.qrLink, /\/detail\.html\?code=T-QR$/);
    assert.match(doc.qrImage, /^data:image\/png;base64,/);

    await call('PUT', `/api/artifacts/${doc._id}`, { body: { code: 'T-QR2' } });
    doc = await Artifact.findById(doc._id).lean();
    assert.match(doc.qrLink, /code=T-QR2$/);

    await Artifact.updateOne({ _id: doc._id }, { $unset: { qrLink: 1, qrImage: 1 } });
    const artifactService = require('../services/artifact.service');
    assert.ok(await artifactService.syncQrCodes() >= 1);
    assert.match((await Artifact.findById(doc._id).lean()).qrImage, /^data:image\/png/);
});
