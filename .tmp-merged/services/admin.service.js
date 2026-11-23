const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const adminRepository = require('../repositories/admin.repository');
const AppError = require('../utils/AppError');

class AdminService {
    // Đăng nhập, trả về JWT
    async login(body) {
        const { username, password } = body || {};
        if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
            throw new AppError(400, 'Cần nhập tên đăng nhập và mật khẩu');
        }

        const admin = await adminRepository.findByUsername(username.trim());
        const passwordOk = admin && (await bcrypt.compare(password, admin.password));
        // Cùng một thông báo cho cả "sai tên" và "sai mật khẩu" để không lộ tài khoản nào tồn tại
        if (!passwordOk) throw new AppError(401, 'Sai tên đăng nhập hoặc mật khẩu!');

        const token = jwt.sign(
            { id: String(admin._id), username: admin.username, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );
        return { token };
    }

    // Tạo tài khoản admin từ ADMIN_USERNAME / ADMIN_PASSWORD nếu chưa có.
    // Thay cho API đăng ký công khai (API đó cho phép bất kỳ ai tự tạo admin).
    async ensureAdminFromEnv() {
        const username = (process.env.ADMIN_USERNAME || '').trim();
        const password = process.env.ADMIN_PASSWORD || '';
        if (!username || !password) return 'skipped';
        if (password.length < 8) throw new Error('ADMIN_PASSWORD cần ít nhất 8 ký tự');

        const existing = await adminRepository.findByUsername(username);
        if (existing) return 'exists';

        const hashed = await bcrypt.hash(password, 10);
        await adminRepository.create({ username, password: hashed, role: 'admin' });
        return 'created';
    }
}

module.exports = new AdminService();
