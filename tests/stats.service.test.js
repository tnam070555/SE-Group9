const test = require('node:test');
const assert = require('node:assert');
const viewRepository = require('../repositories/view.repository');
const artifactRepository = require('../repositories/artifact.repository');
const deviceRepository = require('../repositories/device.repository');
const feedbackRepository = require('../repositories/feedback.repository');
const statsService = require('../services/stats.service');

test.afterEach(() => test.mock.restoreAll());

// Giả lập các truy vấn thống kê theo thời gian (không cần MongoDB thật)
function mockTimeQueries({ online = 0, daily = [], between = 0, rating = { average: null, count: 0 } } = {}) {
    test.mock.method(deviceRepository, 'countOnline', async () => online);
    test.mock.method(viewRepository, 'countDailySince', async () => daily);
    test.mock.method(viewRepository, 'countBetween', async () => between);
    test.mock.method(feedbackRepository, 'getRatingSummary', async () => rating);
}

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

test('heartbeat ghi thiết bị vào database; mã sai thì lỗi 400', async () => {
    const upsert = test.mock.method(deviceRepository, 'upsertHeartbeat', async () => {});
    await statsService.heartbeat('abcdefgh-1234', { ip: '::1' });
    assert.strictEqual(upsert.mock.callCount(), 1);
    await assert.rejects(() => statsService.heartbeat('x'), (e) => e.status === 400);
    assert.strictEqual(upsert.mock.callCount(), 1);
});

test('getStats: số liệu theo ngày đủ số ngày, ngày trống = 0; tháng và đánh giá', async () => {
    const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10); // ngày hôm nay theo giờ VN
    mockTimeQueries({
        daily: [{ _id: { day: today, type: 'view' }, count: 4 }, { _id: { day: today, type: 'play' }, count: 1 }],
        between: 3,
        rating: { average: 4.666, count: 3 },
    });
    test.mock.method(artifactRepository, 'findAll', async () => []);
    test.mock.method(viewRepository, 'countViewsSince', async () => 0);
    test.mock.method(viewRepository, 'countGroupedBy', async () => []);

    const stats = await statsService.getStats({ days: '30' });
    assert.strictEqual(stats.chartDays, 30);
    assert.strictEqual(stats.daily.length, 30);
    assert.deepStrictEqual(stats.daily[29], { date: today, views: 4, plays: 1 });
    assert.deepStrictEqual([stats.daily[0].views, stats.daily[0].plays], [0, 0]);
    assert.deepStrictEqual(stats.month, { scans: 3, scansLastMonth: 3, plays: 3 });
    assert.deepStrictEqual(stats.rating, { average: 4.7, count: 3 });
    assert.strictEqual((await statsService.getStats({ days: '999' })).chartDays, 7); // giá trị lạ -> 7 ngày
});

test('getStats: gom số liệu theo công trình, ngôn ngữ, tổng, online', async () => {
    mockTimeQueries({ online: 2 });
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
