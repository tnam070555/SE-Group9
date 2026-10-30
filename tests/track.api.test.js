const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
process.env.TRACK_RATE_LIMIT_MAX = '8'; // đặt thấp để thử giới hạn tần suất; phải đặt trước khi nạp app

const app = require('../app');
const artifactRepository = require('../repositories/artifact.repository');
const viewRepository = require('../repositories/view.repository');
const presence = require('../services/presence.service');

let server;
let base;
const adminToken = jwt.sign({ id: '1', username: 'admin', role: 'admin' }, 'test-secret', { expiresIn: '1h' });
const userToken = jwt.sign({ id: '2', username: 'khach', role: 'user' }, 'test-secret', { expiresIn: '1h' });

test.before(() => {
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());
test.beforeEach(() => presence.reset());
test.afterEach(() => test.mock.restoreAll());

const post = (path, body, token) => fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
});

// Các thử nghiệm dùng chung giới hạn 8 yêu cầu/phút của IP này, nên thứ tự và số lượng được tính toán bên dưới.

test('GET /api/admin/stats: không token 401, không phải admin 403, admin 200 (không đi qua giới hạn tần suất)', async () => {
    test.mock.method(artifactRepository, 'findAll', async () => [{ code: 'DDL-01', name: 'A' }]);
    test.mock.method(viewRepository, 'countGroupedBy', async () => []);
    test.mock.method(viewRepository, 'countViewsSince', async () => 0);
    assert.strictEqual((await fetch(base + '/api/admin/stats')).status, 401);
    assert.strictEqual((await fetch(base + '/api/admin/stats', { headers: { Authorization: `Bearer ${userToken}` } })).status, 403);
    const res = await fetch(base + '/api/admin/stats', { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.strictEqual(res.status, 200);
    const { data } = await res.json();
    assert.strictEqual(data.onlineNow, 0);
    assert.deepStrictEqual(data.totals, { views: 0, plays: 0 });
});

test('heartbeat -> 204 và admin thấy 1 thiết bị online', async () => {
    assert.strictEqual((await post('/api/track/heartbeat', { deviceId: 'abcdefgh-1234' })).status, 204);
    test.mock.method(artifactRepository, 'findAll', async () => []);
    test.mock.method(viewRepository, 'countGroupedBy', async () => []);
    test.mock.method(viewRepository, 'countViewsSince', async () => 0);
    const { data } = await (await fetch(base + '/api/admin/stats', { headers: { Authorization: `Bearer ${adminToken}` } })).json();
    assert.strictEqual(data.onlineNow, 1);
});

test('heartbeat sai mã -> 400; không có body -> 400', async () => {
    assert.strictEqual((await post('/api/track/heartbeat', { deviceId: 'ngan' })).status, 400);
    assert.strictEqual((await post('/api/track/heartbeat')).status, 400);
});

test('event hợp lệ -> 204; công trình không có -> 404; dữ liệu sai -> 400', async () => {
    let saved;
    test.mock.method(viewRepository, 'create', async (e) => { saved = e; });
    test.mock.method(artifactRepository, 'findByCode', async (c) => (c === 'DDL-01' ? { code: c } : null));
    assert.strictEqual((await post('/api/track/event', { code: 'DDL-01', language: 'ko', type: 'play' })).status, 204);
    assert.deepStrictEqual(saved, { code: 'DDL-01', language: 'ko', type: 'play' });
    assert.strictEqual((await post('/api/track/event', { code: 'ZZZ', type: 'view' })).status, 404);
    assert.strictEqual((await post('/api/track/event', { code: 'DDL-01', type: 'xoa' })).status, 400);
});

test('vượt giới hạn tần suất -> 429', async () => {
    // đã dùng 6 yêu cầu ở các thử nghiệm trên (heartbeat x3, event x3...); gửi thêm cho đến khi bị chặn
    let status = 0;
    for (let i = 0; i < 12 && status !== 429; i++) status = (await post('/api/track/heartbeat', { deviceId: 'abcdefgh-9999' })).status;
    assert.strictEqual(status, 429);
});
