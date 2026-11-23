const adminService = require('../services/admin.service');

class AdminController {
    async login(req, res) {
        const { token } = await adminService.login(req.body);
        res.status(200).json({ success: true, message: 'Đăng nhập thành công!', token });
    }
}

module.exports = new AdminController();
