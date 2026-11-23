const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const adminRepository = require('../repositories/admin.repository');
const adminService = require('../services/admin.service');

process.env.JWT_SECRET = 'test-secret';
const HOUR = 60 * 60 * 1000;
const hash = bcrypt.hashSync('MatKhau123', 4);
// Admin mới đổi mật khẩu 1 giờ trước
const makeAdmin = (extra = {}) => ({
    _id: 'id1', username: 'admin', role: 'admin', password: hash,
    passwordChangedAt: new Date(Date.now() - HOUR), failedLoginAttempts: 0, ...extra,
});

test.afterEach(() => {
    test.mock.restoreAll();
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
});

// ---------- Đăng nhập cơ bản ----------
test('thiếu mật khẩu thì lỗi 400', async () => {
    await assert.rejects(() => adminService.login({ username: 'admin' }), (err) => err.status === 400);
});

test('không có body thì lỗi 400', async () => {
    await assert.rejects(() => adminService.login(undefined), (err) => err.status === 400);
});

test('tài khoản không tồn tại thì lỗi 401', async () => {
    test.mock.method(adminRepository, 'findByUsername', async () => null);
    await assert.rejects(() => adminService.login({ username: 'x', password: 'MatKhau123' }), (err) => err.status === 401);
});

test('đăng nhập đúng thì trả token chứa vai trò admin và mốc hết hạn mật khẩu', async () => {
    test.mock.method(adminRepository, 'findByUsername', async () => makeAdmin());
    const result = await adminService.login({ username: 'admin', password: 'MatKhau123' });
    const payload = jwt.verify(result.token, 'test-secret');
    assert.strictEqual(payload.username, 'admin');
    assert.strictEqual(payload.role, 'admin');
    assert.strictEqual(result.mustChangePassword, false);
    // Đổi 1 giờ trước → còn khoảng 23 giờ
    const left = payload.pwdExp * 1000 - Date.now();
    assert.ok(left > 22 * HOUR && left <= 23 * HOUR + 1000, `còn ${left / HOUR} giờ`);
});

// ---------- Sai 2 lần thì khóa 15 phút ----------
test('sai lần 1: lỗi 401, tăng bộ đếm, chưa khóa', async () => {
    test.mock.method(adminRepository, 'findByUsername', async () => makeAdmin());
    const inc = test.mock.method(adminRepository, 'incrementFailedLogin', async () => ({ failedLoginAttempts: 1 }));
    const lock = test.mock.method(adminRepository, 'lock', async () => {});
    await assert.rejects(() => adminService.login({ username: 'admin', password: 'sai' }), (err) => err.status === 401);
    assert.strictEqual(inc.mock.callCount(), 1);
    assert.strictEqual(lock.mock.callCount(), 0);
});

test('sai lần 2: khóa 15 phút, lỗi 423 ACCOUNT_LOCKED', async () => {
    test.mock.method(adminRepository, 'findByUsername', async () => makeAdmin({ failedLoginAttempts: 1 }));
    test.mock.method(adminRepository, 'incrementFailedLogin', async () => ({ failedLoginAttempts: 2 }));
    const lock = test.mock.method(adminRepository, 'lock', async () => {});
    await assert.rejects(() => adminService.login({ username: 'admin', password: 'sai' }),
        (err) => err.status === 423 && err.code === 'ACCOUNT_LOCKED');
    assert.strictEqual(lock.mock.callCount(), 1);
    const until = lock.mock.calls[0].arguments[1].getTime() - Date.now();
    assert.ok(until > 14 * 60 * 1000 && until <= 15 * 60 * 1000, `khóa ${until / 60000} phút`);
});

test('đang bị khóa: nhập ĐÚNG mật khẩu vẫn bị từ chối 423', async () => {
    test.mock.method(adminRepository, 'findByUsername', async () => makeAdmin({ lockUntil: new Date(Date.now() + 10 * 60 * 1000) }));
    await assert.rejects(() => adminService.login({ username: 'admin', password: 'MatKhau123' }),
        (err) => err.status === 423 && /10 phút/.test(err.message));
});

test('hết thời gian khóa: đăng nhập đúng được, xóa trạng thái khóa', async () => {
    test.mock.method(adminRepository, 'findByUsername', async () => makeAdmin({ lockUntil: new Date(Date.now() - 1000) }));
    const reset = test.mock.method(adminRepository, 'resetLoginState', async () => {});
    const result = await adminService.login({ username: 'admin', password: 'MatKhau123' });
    assert.ok(result.token);
    assert.strictEqual(reset.mock.callCount(), 1);
});

test('đăng nhập đúng sau 1 lần sai: xóa bộ đếm (lần sai sau lại tính từ đầu)', async () => {
    test.mock.method(adminRepository, 'findByUsername', async () => makeAdmin({ failedLoginAttempts: 1 }));
    const reset = test.mock.method(adminRepository, 'resetLoginState', async () => {});
    await adminService.login({ username: 'admin', password: 'MatKhau123' });
    assert.strictEqual(reset.mock.callCount(), 1);
});

// ---------- Mật khẩu hết hạn sau 24 giờ ----------
test('mật khẩu đổi quá 24 giờ: đăng nhập được nhưng bắt buộc đổi mật khẩu', async () => {
    test.mock.method(adminRepository, 'findByUsername', async () => makeAdmin({ passwordChangedAt: new Date(Date.now() - 25 * HOUR) }));
    const result = await adminService.login({ username: 'admin', password: 'MatKhau123' });
    assert.strictEqual(result.mustChangePassword, true);
    assert.ok(jwt.verify(result.token, 'test-secret').pwdExp * 1000 <= Date.now());
});

test('tài khoản cũ chưa có passwordChangedAt: tính từ lúc tạo', async () => {
    test.mock.method(adminRepository, 'findByUsername', async () =>
        makeAdmin({ passwordChangedAt: undefined, createdAt: new Date(Date.now() - 48 * HOUR) }));
    const result = await adminService.login({ username: 'admin', password: 'MatKhau123' });
    assert.strictEqual(result.mustChangePassword, true);
});

// ---------- Đổi mật khẩu ----------
test('đổi mật khẩu: sai mật khẩu hiện tại -> 400 (không khóa, không đăng xuất)', async () => {
    test.mock.method(adminRepository, 'findById', async () => makeAdmin());
    await assert.rejects(() => adminService.changePassword('id1', { currentPassword: 'sai', newPassword: 'MatKhauMoi456' }),
        (err) => err.status === 400);
});

test('đổi mật khẩu: mật khẩu mới ngắn hoặc trùng mật khẩu cũ -> 400', async () => {
    await assert.rejects(() => adminService.changePassword('id1', { currentPassword: 'MatKhau123', newPassword: '123' }),
        (err) => err.status === 400);
    await assert.rejects(() => adminService.changePassword('id1', { currentPassword: 'MatKhau123', newPassword: 'MatKhau123' }),
        (err) => err.status === 400);
});

test('đổi mật khẩu thành công: lưu bản băm, token mới còn hạn 24 giờ', async () => {
    test.mock.method(adminRepository, 'findById', async () => makeAdmin({ passwordChangedAt: new Date(Date.now() - 30 * HOUR) }));
    const update = test.mock.method(adminRepository, 'updatePassword', async () => {});
    const result = await adminService.changePassword('id1', { currentPassword: 'MatKhau123', newPassword: 'MatKhauMoi456' });

    const [, hashed, changedAt] = update.mock.calls[0].arguments;
    assert.ok(await bcrypt.compare('MatKhauMoi456', hashed));
    assert.ok(Date.now() - changedAt.getTime() < 5000);
    const left = jwt.verify(result.token, 'test-secret').pwdExp * 1000 - Date.now();
    assert.ok(left > 23.9 * HOUR && left <= 24 * HOUR);
});

// ---------- Tạo admin từ .env ----------
test('ensureAdminFromEnv: bỏ qua nếu thiếu biến môi trường', async () => {
    assert.strictEqual(await adminService.ensureAdminFromEnv(), 'skipped');
});

test('ensureAdminFromEnv: mật khẩu ngắn thì báo lỗi', async () => {
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = '123';
    await assert.rejects(() => adminService.ensureAdminFromEnv());
});

test('ensureAdminFromEnv: tạo admin với mật khẩu đã băm và mốc đổi mật khẩu', async () => {
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'MatKhau123';
    let saved;
    test.mock.method(adminRepository, 'findByUsername', async () => null);
    test.mock.method(adminRepository, 'create', async (data) => { saved = data; });

    assert.strictEqual(await adminService.ensureAdminFromEnv(), 'created');
    assert.notStrictEqual(saved.password, 'MatKhau123');
    assert.ok(await bcrypt.compare('MatKhau123', saved.password));
    assert.ok(saved.passwordChangedAt instanceof Date);
});

test('ensureAdminFromEnv: không tạo trùng nếu đã tồn tại', async () => {
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'MatKhau123';
    test.mock.method(adminRepository, 'findByUsername', async () => makeAdmin());
    assert.strictEqual(await adminService.ensureAdminFromEnv(), 'exists');
});
