const test = require('node:test');
const assert = require('node:assert');
const viewRepository = require('../repositories/view.repository');
const artifactRepository = require('../repositories/artifact.repository');
const presence = require('../services/presence.service');
const statsService = require('../services/stats.service');

test.beforeEach(() => presence.reset());
test.afterEach(() => test.mock.restoreAll());

const reject = (body, status) => assert.rejects(() => statsService.recordEvent(body), (e) => e.status === status, JSON.stringify(body));

test('ghi lượt xem hợp lệ: chuẩn hóa mã, dùng mã của công trình trong database', async () => {
    let saved;
    test.mock.method(artifactRepository, 'findByCode', async (c) => ({ code: c }));
    test.mock.method(viewRepository, 'create', async (e) => { saved = e; });
    await statsService.recordEvent({ code: 'ddl-01', language: 'ja', type: 'view' });
    assert.deepStrictEqual(saved, { code: 'DDL-01', language: 'ja', type: 'view' });
});

test('không gửi language thì mặc định vi; chấp nhận en-US', async () => {
    const saved = [];
    test.mock.method(artifactRepository, 'findByCode', async (c) => ({ code: c }));
    test.mock.method(viewRepository, 'create', async (e) => { saved.push(e.language); });
    await statsService.recordEvent({ code: 'DDL-01', type: 'play' });
    await statsService.recordEvent({ code: 'DDL-01', language: 'en-US', type: 'play' });
    assert.deepStrictEqual(saved, ['vi', 'en']);
});

test('dữ liệu sai thì lỗi 400 và không chạm database', async () => {
    const create = test.mock.method(viewRepository, 'create', async () => {});
    const find = test.mock.method(artifactRepository, 'findByCode', async () => ({ code: 'X' }));
    await reject(undefined, 400);
    await reject({ code: 'DDL-01', type: 'hack' }, 400);
    await reject({ code: 'DDL-01', type: { $ne: 'view' } }, 400);
    await reject({ code: { $ne: '' }, type: 'view' }, 400);
    await reject({ code: 'co khoang trang', type: 'view' }, 400);
    await reject({ code: 'x'.repeat(51), type: 'view' }, 400);
    await reject({ code: 'DDL-01', language: 'fr', type: 'view' }, 400);
    assert.strictEqual(create.mock.callCount(), 0);
    assert.strictEqual(find.mock.callCount(), 0);
});

test('công trình không tồn tại thì lỗi 404 và không ghi', async () => {
    test.mock.method(artifactRepository, 'findByCode', async () => null);
    const create = test.mock.method(viewRepository, 'create', async () => {});
    await reject({ code: 'KHONG-CO', type: 'view' }, 404);
    assert.strictEqual(create.mock.callCount(), 0);
});

test('heartbeat ghi nhận thiết bị online', () => {
    statsService.heartbeat('abcdefgh-1234');
    assert.strictEqual(presence.countOnline(), 1);
    assert.throws(() => statsService.heartbeat('x'), (e) => e.status === 400);
});

test('getStats: gom số liệu theo công trình, ngôn ngữ, tổng, online', async () => {
    presence.touch('abcdefgh-0001');
    presence.touch('abcdefgh-0002');
    test.mock.method(artifactRepository, 'findAll', async () => [
        { code: 'DDL-01', name: 'Phòng Khánh Tiết' }, { code: 'DDL-02', name: 'Phòng Trình Quốc Thư' }, { code: 'DDL-03', name: 'Chưa ai xem' },
    ]);
    test.mock.method(viewRepository, 'countViewsSince', async () => 7);
    test.mock.method(viewRepository, 'countGroupedBy', async (field) => field === 'code'
        ? [
            { _id: { key: 'DDL-01', type: 'view' }, count: 5 }, { _id: { key: 'DDL-01', type: 'play' }, count: 2 },
            { _id: { key: 'DDL-02', type: 'view' }, count: 9 },
            { _id: { key: 'DA-XOA', type: 'view' }, count: 1 }, // công trình đã bị xóa vẫn tính vào tổng
        ]
        : [
            { _id: { key: 'ja', type: 'view' }, count: 8 }, { _id: { key: 'vi', type: 'view' }, count: 7 }, { _id: { key: 'ja', type: 'play' }, count: 2 },
        ]);

    const stats = await statsService.getStats();
    assert.strictEqual(stats.onlineNow, 2);
    assert.strictEqual(stats.onlineWindowSeconds, 60);
    assert.deepStrictEqual(stats.totals, { views: 15, plays: 2 });
    assert.strictEqual(stats.viewsLast24Hours, 7);
    assert.deepStrictEqual(stats.byBuilding.map((b) => [b.code, b.views, b.plays]), [['DDL-02', 9, 0], ['DDL-01', 5, 2], ['DDL-03', 0, 0]]);
    assert.strictEqual(stats.byBuilding[0].name, 'Phòng Trình Quốc Thư');
    assert.deepStrictEqual(stats.byLanguage.map((l) => l.language), ['vi', 'en', 'ja', 'ko', 'zh']);
    const ja = stats.byLanguage.find((l) => l.language === 'ja');
    assert.deepStrictEqual([ja.views, ja.plays], [8, 2]);
    assert.deepStrictEqual([stats.byLanguage.find((l) => l.language === 'ko').views], [0]);
});
