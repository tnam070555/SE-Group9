const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const adminRepository = require('../repositories/admin.repository');
const AppError = require('../utils/AppError');

// Chính sách đăng nhập (đổi được trong .env)
// - Mật khẩu hết hạn sau PASSWORD_MAX_AGE_HOURS giờ kể từ lần đổi gần nhất → bắt buộc đổi mới vào được admin
// - Đăng nhập sai LOGIN_MAX_ATTEMPTS lần liên tiếp → khóa LOGIN_LOCK_MINUTES phút
function policy() {
    return {
        maxAgeHours: Number(process.env.PASSWORD_MAX_AGE_HOURS) || 24,
        maxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS) || 2,
        lockMinutes: Number(process.env.LOGIN_LOCK_MINUTES) || 15,
    };
}

const MIN_PASSWORD_LENGTH = 8;

/** Thời điểm mật khẩu hết hạn (ms). Tài khoản cũ chưa có passwordChangedAt thì tính từ lúc tạo. */
function passwordExpiresAt(admin, now = Date.now()) {
    const changedAt = admin.passwordChangedAt || admin.createdAt || new Date(now);
    return new Date(changedAt).getTime() + policy().maxAgeHours * 60 * 60 * 1000;
}

/** Token đăng nhập. pwdExp (giây) = lúc mật khẩu hết hạn; middleware chặn vào admin khi đã quá mốc này. */
function signToken(admin, expiresAtMs) {
    return jwt.sign(
        { id: String(admin._id), username: admin.username, role: admin.role, pwdExp: Math.floor(expiresAtMs / 1000) },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
}

function minutesLeft(untilMs, now) {
    return Math.max(1, Math.ceil((untilMs - now) / 60000));
}

class AdminService {
    // Đăng nhập, trả về JWT và cho biết có phải đổi mật khẩu ngay không
    async login(body) {
        const { username, password } = body || {};
        if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
            throw new AppError(400, 'Cần nhập tên đăng nhập và mật khẩu');
        }
        const { maxAttempts, lockMinutes } = policy();
        const wrongMessage = `Sai tên đăng nhập hoặc mật khẩu! Sai ${maxAttempts} lần liên tiếp sẽ bị khóa ${lockMinutes} phút.`;

        const admin = await adminRepository.findByUsername(username.trim());
        // Cùng một thông báo cho cả "sai tên" và "sai mật khẩu" để không lộ tài khoản nào tồn tại
        if (!admin) throw new AppError(401, wrongMessage);

        // Đang bị khóa: không kiểm tra mật khẩu (kể cả đúng) để không dò được mật khẩu trong lúc khóa
        const now = Date.now();
        const lockUntil = admin.lockUntil ? new Date(admin.lockUntil).getTime() : 0;
        if (lockUntil > now) {
            throw new AppError(423,
                `Tài khoản đang bị khóa do đăng nhập sai nhiều lần. Thử lại sau ${minutesLeft(lockUntil, now)} phút.`,
                'ACCOUNT_LOCKED');
        }

        const passwordOk = await bcrypt.compare(password, admin.password);
        if (!passwordOk) {
            const updated = await adminRepository.incrementFailedLogin(admin._id);
            const attempts = updated ? updated.failedLoginAttempts : maxAttempts;
            if (attempts >= maxAttempts) {
                await adminRepository.lock(admin._id, new Date(now + lockMinutes * 60 * 1000));
                throw new AppError(423,
                    `Sai mật khẩu ${maxAttempts} lần liên tiếp. Tài khoản bị khóa ${lockMinutes} phút.`,
                    'ACCOUNT_LOCKED');
            }
            throw new AppError(401, wrongMessage);
        }

        // Đúng mật khẩu: xóa bộ đếm sai
        if (admin.failedLoginAttempts || admin.lockUntil) await adminRepository.resetLoginState(admin._id);

        const expiresAt = passwordExpiresAt(admin, now);
        return {
            token: signToken(admin, expiresAt),
            mustChangePassword: expiresAt <= now,
            passwordExpiresAt: new Date(expiresAt).toISOString(),
        };
    }

    // Đổi mật khẩu. Được phép cả khi mật khẩu đã hết hạn (đó là lối duy nhất để vào lại admin).
    async changePassword(adminId, body) {
        const { currentPassword, newPassword } = body || {};
        if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
            throw new AppError(400, 'Cần nhập mật khẩu hiện tại và mật khẩu mới');
        }
        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            throw new AppError(400, `Mật khẩu mới cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự`);
        }
        if (newPassword === currentPassword) {
            throw new AppError(400, 'Mật khẩu mới phải khác mật khẩu hiện tại');
        }

        const admin = await adminRepository.findById(adminId);
        if (!admin) throw new AppError(401, 'Tài khoản không còn tồn tại, vui lòng đăng nhập lại');

        // Dùng 400 (không phải 401) để trang web không hiểu nhầm là hết phiên rồi tự đăng xuất
        if (!(await bcrypt.compare(currentPassword, admin.password))) {
            throw new AppError(400, 'Mật khẩu hiện tại không đúng');
        }

        const changedAt = new Date();
        await adminRepository.updatePassword(admin._id, await bcrypt.hash(newPassword, 10), changedAt);

        const expiresAt = passwordExpiresAt({ passwordChangedAt: changedAt });
        return { token: signToken(admin, expiresAt), passwordExpiresAt: new Date(expiresAt).toISOString() };
    }

    // Tạo tài khoản admin từ ADMIN_USERNAME / ADMIN_PASSWORD nếu chưa có.
    // Thay cho API đăng ký công khai (API đó cho phép bất kỳ ai tự tạo admin).
    async ensureAdminFromEnv() {
        const username = (process.env.ADMIN_USERNAME || '').trim();
        const password = process.env.ADMIN_PASSWORD || '';
        if (!username || !password) return 'skipped';
        if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`ADMIN_PASSWORD cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự`);

        const existing = await adminRepository.findByUsername(username);
        if (existing) return 'exists';

        const hashed = await bcrypt.hash(password, 10);
        await adminRepository.create({ username, password: hashed, role: 'admin', passwordChangedAt: new Date() });
        return 'created';
    }
}

module.exports = new AdminService();
module.exports.policy = policy;
