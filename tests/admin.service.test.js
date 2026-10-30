const test = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const adminRepository = require('../repositories/admin.repository');
const adminService = require('../services/admin.service');

process.env.JWT_SECRET = 'test-secret';
const fakeAdmin = { _id: 'id1', username: 'admin', role: 'admin', password: bcrypt.hashSync('MatKhau123', 4) };

test.afterEach(() => {
    test.mock.restoreAll();
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;
});

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

test('sai mật khẩu thì lỗi 401', async () => {
    test.mock.method(adminRepository, 'findByUsername', async () => fakeAdmin);
    await assert.rejects(() => adminService.login({ username: 'admin', password: 'sai' }), (err) => err.status === 401);
});

test('đăng nhập đúng thì trả token chứa vai trò admin', async () => {
    test.mock.method(adminRepository, 'findByUsername', async () => fakeAdmin);
    const { token } = await adminService.login({ username: 'admin', password: 'MatKhau123' });
    const payload = jwt.verify(token, 'test-secret');
    assert.strictEqual(payload.username, 'admin');
    assert.strictEqual(payload.role, 'admin');
});

test('ensureAdminFromEnv: bỏ qua nếu thiếu biến môi trường', async () => {
    assert.strictEqual(await adminService.ensureAdminFromEnv(), 'skipped');
});

test('ensureAdminFromEnv: mật khẩu ngắn thì báo lỗi', async () => {
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = '123';
    await assert.rejects(() => adminService.ensureAdminFromEnv());
});

test('ensureAdminFromEnv: tạo admin với mật khẩu đã băm', async () => {
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'MatKhau123';
    let saved;
    test.mock.method(adminRepository, 'findByUsername', async () => null);
    test.mock.method(adminRepository, 'create', async (data) => { saved = data; });

    assert.strictEqual(await adminService.ensureAdminFromEnv(), 'created');
    assert.notStrictEqual(saved.password, 'MatKhau123');
    assert.ok(await bcrypt.compare('MatKhau123', saved.password));
});

test('ensureAdminFromEnv: không tạo trùng nếu đã tồn tại', async () => {
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'MatKhau123';
    test.mock.method(adminRepository, 'findByUsername', async () => fakeAdmin);
    assert.strictEqual(await adminService.ensureAdminFromEnv(), 'exists');
});
