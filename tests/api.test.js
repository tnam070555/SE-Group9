const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

const app = require('../app');
const artifactRepository = require('../repositories/artifact.repository');
const adminRepository = require('../repositories/admin.repository');

let server;
let base;
const adminToken = jwt.sign({ id: '1', username: 'admin', role: 'admin' }, 'test-secret', { expiresIn: '1h' });
const userToken = jwt.sign({ id: '2', username: 'khach', role: 'user' }, 'test-secret', { expiresIn: '1h' });

test.before(async () => {
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());
test.afterEach(() => test.mock.restoreAll());

function call(method, path, { token, body } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(base + path, {
        method, headers,
        body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
    });
}

// ---------- Công khai ----------
test('GET /api/health trả 200', async () => {
    assert.strictEqual((await call('GET', '/api/health')).status, 200);
});

// ---------- Trang web tĩnh: chỉ phục vụ thư mục public/ ----------
test('GET / trả trang index.html', async () => {
    const res = await call('GET', '/');
    assert.strictEqual(res.status, 200);
    assert.match(await res.text(), /Dinh Độc Lập/);
});

test('GET /detail.html trả 200', async () => {
    assert.strictEqual((await call('GET', '/detail.html')).status, 200);
});

test('không để lộ .env, mã nguồn, package.json qua web', async () => {
    for (const path of ['/.env', '/server.js', '/package.json', '/../.env', '/services/admin.service.js']) {
        const res = await call('GET', path);
        assert.notStrictEqual(res.status, 200, path);
    }
});

test('GET /api/artifacts công khai, trả danh sách', async () => {
    test.mock.method(artifactRepository, 'findAll', async () => [{ name: 'A' }]);
    const res = await call('GET', '/api/artifacts');
    assert.strictEqual(res.status, 200);
    assert.strictEqual((await res.json()).data.length, 1);
});

test('GET /api/artifacts/code/:code trả công trình', async () => {
    test.mock.method(artifactRepository, 'findByCode', async (c) => ({ code: c, name: 'Phòng Khánh Tiết' }));
    const res = await call('GET', '/api/artifacts/code/ddl-01');
    assert.strictEqual(res.status, 200);
    assert.strictEqual((await res.json()).data.code, 'DDL-01');
});

test('GET /api/artifacts/code/:code không tồn tại -> 404', async () => {
    test.mock.method(artifactRepository, 'findByCode', async () => null);
    assert.strictEqual((await call('GET', '/api/artifacts/code/ZZZ')).status, 404);
});

test('GET QR trả ảnh PNG', async () => {
    test.mock.method(artifactRepository, 'findByCode', async () => ({ code: 'DDL-01' }));
    const res = await call('GET', '/api/artifacts/code/DDL-01/qr?base=http://192.168.1.10:5000');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'image/png');
    const bytes = Buffer.from(await res.arrayBuffer());
    assert.ok(bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])));
});

test('GET QR không truyền base thì dùng địa chỉ đang truy cập', async () => {
    test.mock.method(artifactRepository, 'findByCode', async () => ({ code: 'DDL-01' }));
    assert.strictEqual((await call('GET', '/api/artifacts/code/DDL-01/qr')).status, 200);
});

test('GET QR với base độc hại -> 400', async () => {
    test.mock.method(artifactRepository, 'findByCode', async () => ({ code: 'DDL-01' }));
    assert.strictEqual((await call('GET', '/api/artifacts/code/DDL-01/qr?base=javascript:alert(1)')).status, 400);
});

test('GET /api/artifacts/:id không tồn tại -> 404', async () => {
    test.mock.method(artifactRepository, 'findById', async () => null);
    assert.strictEqual((await call('GET', '/api/artifacts/abc')).status, 404);
});

test('id sai định dạng (CastError) -> 400, không phải 500', async () => {
    test.mock.method(artifactRepository, 'findById', async () => { const e = new Error('x'); e.name = 'CastError'; throw e; });
    assert.strictEqual((await call('GET', '/api/artifacts/khong-hop-le')).status, 400);
});

test('đường dẫn không tồn tại -> 404', async () => {
    assert.strictEqual((await call('GET', '/api/khong-co')).status, 404);
});

// ---------- Bảo vệ API ghi dữ liệu ----------
test('POST không token -> 401', async () => {
    assert.strictEqual((await call('POST', '/api/artifacts', { body: { name: 'A', code: 'C' } })).status, 401);
});

test('PUT không token -> 401 (lỗi cũ: PUT từng không cần token)', async () => {
    assert.strictEqual((await call('PUT', '/api/artifacts/1', { body: { name: 'A' } })).status, 401);
});

test('DELETE không token -> 401', async () => {
    assert.strictEqual((await call('DELETE', '/api/artifacts/1')).status, 401);
});

test('token sai -> 401', async () => {
    assert.strictEqual((await call('POST', '/api/artifacts', { token: 'abc.def.ghi', body: { name: 'A', code: 'C' } })).status, 401);
});

test('token ký bằng khóa khác -> 401', async () => {
    const fake = jwt.sign({ id: '1', username: 'admin', role: 'admin' }, 'sgu_secret_key');
    assert.strictEqual((await call('POST', '/api/artifacts', { token: fake, body: { name: 'A', code: 'C' } })).status, 401);
});

test('token không phải admin -> 403', async () => {
    assert.strictEqual((await call('POST', '/api/artifacts', { token: userToken, body: { name: 'A', code: 'C' } })).status, 403);
});

test('API đăng ký admin công khai đã bị gỡ -> 404', async () => {
    const res = await call('POST', '/api/admin/register', { body: { username: 'hacker', password: '12345678' } });
    assert.strictEqual(res.status, 404);
});

// ---------- Thao tác của admin ----------
test('POST có token admin -> 201', async () => {
    test.mock.method(artifactRepository, 'create', async (d) => d);
    const res = await call('POST', '/api/artifacts', { token: adminToken, body: { name: 'Phòng Khánh Tiết', code: 'DDL-01' } });
    assert.strictEqual(res.status, 201);
});

test('POST thiếu tên -> 400', async () => {
    assert.strictEqual((await call('POST', '/api/artifacts', { token: adminToken, body: { code: 'C' } })).status, 400);
});

test('POST JSON hỏng -> 400', async () => {
    assert.strictEqual((await call('POST', '/api/artifacts', { token: adminToken, body: '{hong' })).status, 400);
});

test('POST trùng code -> 409', async () => {
    test.mock.method(artifactRepository, 'create', async () => { const e = new Error('dup'); e.code = 11000; throw e; });
    assert.strictEqual((await call('POST', '/api/artifacts', { token: adminToken, body: { name: 'A', code: 'C' } })).status, 409);
});

test('PUT có token admin -> 200', async () => {
    test.mock.method(artifactRepository, 'findById', async () => ({ name: 'A', description: 'd', location: 'l' }));
    test.mock.method(artifactRepository, 'updateById', async (id, d) => ({ id, ...d }));
    assert.strictEqual((await call('PUT', '/api/artifacts/1', { token: adminToken, body: { name: 'B' } })).status, 200);
});

test('DELETE có token admin -> 200', async () => {
    test.mock.method(artifactRepository, 'deleteById', async () => ({ id: 1 }));
    assert.strictEqual((await call('DELETE', '/api/artifacts/1', { token: adminToken })).status, 200);
});

// ---------- Đăng nhập ----------
test('đăng nhập đúng -> 200 có token', async () => {
    const admin = { _id: 'i1', username: 'admin', role: 'admin', password: bcrypt.hashSync('MatKhau123', 4) };
    test.mock.method(adminRepository, 'findByUsername', async () => admin);
    const res = await call('POST', '/api/admin/login', { body: { username: 'admin', password: 'MatKhau123' } });
    assert.strictEqual(res.status, 200);
    assert.ok((await res.json()).token);
});

test('đăng nhập sai mật khẩu -> 401', async () => {
    const admin = { _id: 'i1', username: 'admin', role: 'admin', password: bcrypt.hashSync('MatKhau123', 4) };
    test.mock.method(adminRepository, 'findByUsername', async () => admin);
    const res = await call('POST', '/api/admin/login', { body: { username: 'admin', password: 'sai' } });
    assert.strictEqual(res.status, 401);
});

// ---------- Đa ngôn ngữ ----------
const sample = {
    _id: '1', code: 'DDL-01', name: 'Phòng Khánh Tiết', description: 'Mô tả VN', location: 'Tầng trệt',
    translations: { ja: { name: '式典の間', description: '日本語の説明', location: '1階' } },
};

test('GET /api/languages: 5 ngôn ngữ, tiếng Việt là gốc', async () => {
    const res = await call('GET', '/api/languages');
    assert.strictEqual(res.status, 200);
    const { data } = await res.json();
    assert.deepStrictEqual(data.map((l) => l.code), ['vi', 'en', 'ja', 'ko', 'zh']);
    assert.strictEqual(data[0].isSource, true);
    assert.strictEqual(data.find((l) => l.code === 'ja').speech, 'ja-JP');
});

test('GET /api/artifacts?lang=ja trả bản dịch tiếng Nhật', async () => {
    test.mock.method(artifactRepository, 'findAll', async () => [sample]);
    const { data } = await (await call('GET', '/api/artifacts?lang=ja')).json();
    assert.strictEqual(data[0].name, '式典の間');
    assert.strictEqual(data[0].language, 'ja');
    assert.strictEqual(data[0].fallback, false);
});

test('không có ?lang thì trả tiếng Việt', async () => {
    test.mock.method(artifactRepository, 'findAll', async () => [sample]);
    const { data } = await (await call('GET', '/api/artifacts')).json();
    assert.strictEqual(data[0].name, 'Phòng Khánh Tiết');
});

test('?lang=zh-CN chưa có bản dịch thì fallback tiếng Việt', async () => {
    test.mock.method(artifactRepository, 'findByCode', async () => sample);
    const { data } = await (await call('GET', '/api/artifacts/code/DDL-01?lang=zh-CN')).json();
    assert.strictEqual(data.language, 'vi');
    assert.strictEqual(data.fallback, true);
    assert.strictEqual(data.description, 'Mô tả VN');
});

test('?lang không hỗ trợ -> 400', async () => {
    assert.strictEqual((await call('GET', '/api/artifacts?lang=fr')).status, 400);
    assert.strictEqual((await call('GET', '/api/artifacts/code/DDL-01?lang=xx')).status, 400);
});

test('?lang lặp -> 400', async () => {
    assert.strictEqual((await call('GET', '/api/artifacts?lang=en&lang=ja')).status, 400);
});

test('?lang[$ne]=x (thử tiêm NoSQL): Express 5 không dựng thành đối tượng, bị bỏ qua', async () => {
    test.mock.method(artifactRepository, 'findAll', async () => [sample]);
    const res = await call('GET', '/api/artifacts?lang[$ne]=x');
    assert.strictEqual(res.status, 200);
    assert.strictEqual((await res.json()).data[0].language, 'vi');
});

test('PUT bản dịch: không token -> 401', async () => {
    assert.strictEqual((await call('PUT', '/api/artifacts/1/translations/en', { body: { name: 'x' } })).status, 401);
});

test('PUT bản dịch: token admin -> 200', async () => {
    let sent;
    test.mock.method(artifactRepository, 'updateById', async (id, d) => { sent = d; return { id }; });
    const res = await call('PUT', '/api/artifacts/1/translations/en', { token: adminToken, body: { name: 'Hall' } });
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(sent, { $set: { 'translations.en.name': 'Hall' } });
});

test('PUT bản dịch: ngôn ngữ gốc hoặc ngôn ngữ lạ -> 400', async () => {
    assert.strictEqual((await call('PUT', '/api/artifacts/1/translations/vi', { token: adminToken, body: { name: 'x' } })).status, 400);
    assert.strictEqual((await call('PUT', '/api/artifacts/1/translations/fr', { token: adminToken, body: { name: 'x' } })).status, 400);
});

test('POST dịch tự động: không token -> 401; token không phải admin -> 403', async () => {
    assert.strictEqual((await call('POST', '/api/artifacts/1/translate', { body: {} })).status, 401);
    assert.strictEqual((await call('POST', '/api/artifacts/1/translate', { token: userToken, body: {} })).status, 403);
});

test('POST dịch tự động: admin -> 200 kèm báo cáo từng ngôn ngữ', async () => {
    const translationService = require('../services/translation.service');
    test.mock.method(artifactRepository, 'findById', async () => ({ name: 'Tên', description: 'Mô tả', location: 'Vị trí' }));
    test.mock.method(artifactRepository, 'updateById', async () => ({ ok: true }));
    test.mock.method(translationService, 'translateText', async (text, lang) => `${lang}:${text}`);
    const res = await call('POST', '/api/artifacts/1/translate', { token: adminToken, body: { languages: ['en', 'ko'] } });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.deepStrictEqual(Object.keys(body.report), ['en', 'ko']);
});

test('POST dịch tự động không gửi body vẫn chạy (dịch tất cả)', async () => {
    const translationService = require('../services/translation.service');
    test.mock.method(artifactRepository, 'findById', async () => ({ name: 'Tên' }));
    test.mock.method(artifactRepository, 'updateById', async () => ({}));
    test.mock.method(translationService, 'translateText', async () => 'x');
    const res = await call('POST', '/api/artifacts/1/translate', { token: adminToken });
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(Object.keys((await res.json()).report), ['en', 'ja', 'ko', 'zh']);
});
