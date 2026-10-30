const test = require('node:test');
const assert = require('node:assert');
const presence = require('../services/presence.service');

test.beforeEach(() => presence.reset());

test('đếm các thiết bị khác nhau, cùng một thiết bị chỉ tính một lần', () => {
    presence.touch('aaaaaaaa-1', 1000);
    presence.touch('aaaaaaaa-2', 1000);
    presence.touch('aaaaaaaa-1', 2000);
    assert.strictEqual(presence.countOnline(3000), 2);
});

test('thiết bị im lặng quá 60 giây không còn được tính', () => {
    presence.touch('aaaaaaaa-1', 0);
    presence.touch('aaaaaaaa-2', 50_000);
    assert.strictEqual(presence.countOnline(59_000), 2);
    assert.strictEqual(presence.countOnline(61_000), 1); // thiết bị 1 đã quá 60 giây
    assert.strictEqual(presence.countOnline(111_000), 0);
});

test('gửi tín hiệu mới thì thiết bị được tính lại', () => {
    presence.touch('aaaaaaaa-1', 0);
    assert.strictEqual(presence.countOnline(100_000), 0);
    presence.touch('aaaaaaaa-1', 100_000);
    assert.strictEqual(presence.countOnline(100_001), 1);
});

test('mã thiết bị sai định dạng thì lỗi 400', () => {
    for (const bad of [undefined, null, 123, '', 'ngan', 'co khoang trang!', 'x'.repeat(65), { a: 1 }, ['abcdefgh']]) {
        assert.throws(() => presence.touch(bad), (e) => e.status === 400, String(bad));
    }
});

test('vượt giới hạn thiết bị thì lỗi 429, thiết bị đã có vẫn cập nhật được', () => {
    for (let i = 0; i < presence.MAX_DEVICES; i++) presence.touch(`dev-${String(i).padStart(8, '0')}`, 1000);
    assert.throws(() => presence.touch('thiet-bi-moi-1', 1000), (e) => e.status === 429);
    presence.touch('dev-00000000', 2000); // thiết bị cũ vẫn được
    assert.strictEqual(presence.countOnline(2000), presence.MAX_DEVICES);
});
