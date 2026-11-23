const adminService = require('../services/admin.service');

class AdminController {
    async login(req, res) {
        const { token, mustChangePassword, passwordExpiresAt } = await adminService.login(req.body);
        res.status(200).json({
            success: true,
            message: mustChangePassword ? 'Mật khẩu đã hết hạn, vui lòng đổi mật khẩu mới' : 'Đăng nhập thành công!',
            token,
            mustChangePassword,
            passwordExpiresAt,
        });
    }

    async changePassword(req, res) {
        const { token, passwordExpiresAt } = await adminService.changePassword(req.admin.id, req.body);
        res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công!', token, passwordExpiresAt });
    }
}

module.exports = new AdminController();
