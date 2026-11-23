const test = require('node:test');
const assert = require('node:assert');
const deviceRepository = require('../repositories/device.repository');
const presence = require('../services/presence.service');

test.afterEach(() => test.mock.restoreAll());

test('touch: lưu thiết bị vào database kèm IP, loại thiết bị, trang đang xem', async () => {
    const upsert = test.mock.method(deviceRepository, 'upsertHeartbeat', async () => {});
    const now = new Date(5000);
    await presence.touch('aaaaaaaa-1', {
        ip: '::ffff:192.168.1.50',
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
        page: '/detail.html',
    }, now);
    assert.strictEqual(upsert.mock.callCount(), 1);
    const [id, info, at] = upsert.mock.calls[0].arguments;
    assert.strictEqual(id, 'aaaaaaaa-1');
    assert.strictEqual(at, now);
    assert.deepStrictEqual(
        { ip: info.ip, deviceType: info.deviceType, os: info.os, browser: info.browser, page: info.page },
        { ip: '192.168.1.50', deviceType: 'Mobile', os: 'Android', browser: 'Chrome', page: '/detail.html' },
    );
});

test('touch: deviceId sai thì lỗi 400 và không ghi database', async () => {
    const upsert = test.mock.method(deviceRepository, 'upsertHeartbeat', async () => {});
    for (const bad of [undefined, null, '', 'ngan', 'co khoang trang 123', 'a'.repeat(65), { $ne: '' }, 12345678]) {
        await assert.rejects(() => presence.touch(bad), (e) => e.status === 400, String(bad));
    }
    assert.strictEqual(upsert.mock.callCount(), 0);
});

test('touch: trang không hợp lệ thì bỏ qua trường page', async () => {
    const upsert = test.mock.method(deviceRepository, 'upsertHeartbeat', async () => {});
    await presence.touch('aaaaaaaa-1', { page: 'javascript:alert(1)' });
    assert.strictEqual('page' in upsert.mock.calls[0].arguments[1], false);
});

test('countOnline: đếm thiết bị gửi tín hiệu trong 60 giây gần nhất', async () => {
    const count = test.mock.method(deviceRepository, 'countOnline', async () => 2);
    assert.strictEqual(await presence.countOnline(new Date(100_000)), 2);
    assert.strictEqual(count.mock.calls[0].arguments[0].getTime(), 40_000);
});

test('remove: đánh dấu thiết bị đã rời; mã sai thì bỏ qua', async () => {
    const mark = test.mock.method(deviceRepository, 'markDisconnected', async () => {});
    await presence.remove('aaaaaaaa-1');
    await presence.remove('x');
    assert.strictEqual(mark.mock.callCount(), 1);
    assert.strictEqual(mark.mock.calls[0].arguments[0], 'aaaaaaaa-1');
});

test('normalizeIp và parseUserAgent', () => {
    assert.strictEqual(presence.normalizeIp('::1'), '127.0.0.1 (máy chủ)');
    assert.strictEqual(presence.normalizeIp('::ffff:10.0.0.7'), '10.0.0.7');
    assert.deepStrictEqual(
        presence.parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'),
        { deviceType: 'Mobile', os: 'iOS', browser: 'Safari' },
    );
    assert.deepStrictEqual(
        presence.parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0'),
        { deviceType: 'Desktop', os: 'Windows', browser: 'Edge' },
    );
});
