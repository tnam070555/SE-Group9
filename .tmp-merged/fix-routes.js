const fs = require('fs');
const path = require('path');

const p = (...parts) => path.join(process.cwd(), ...parts);

function fixAdminRoutes() {
    const file = p('routers', 'admin.routes.js');
    if (!fs.existsSync(file)) return console.log('❌ Không tìm thấy admin.routes.js');
    let code = fs.readFileSync(file, 'utf8');

    // Nhúng statsController nếu chưa có
    if (!code.includes('stats.controller')) {
        code = code.replace(
            /(const .* = require\('\.\.\/controllers\/admin\.controller'\);)/,
            "$1\nconst statsController = require('../controllers/stats.controller');"
        );
    }

    // Bổ sung route /stats trước dòng module.exports
    if (!code.includes("router.get('/stats'")) {
        code = code.replace(
            /module\.exports\s*=\s*router;/,
            "router.get('/stats', verifyToken, requireAdmin, statsController.getStats);\n\nmodule.exports = router;"
        );
        fs.writeFileSync(file, code);
        console.log('✅ Đã nối lại API /api/admin/stats vào admin.routes.js');
    } else {
        console.log('⚠️ Route /stats đã tồn tại, bỏ qua.');
    }
}

function fixTrackController() {
    const file = p('controllers', 'track.controller.js');
    if (!fs.existsSync(file)) return console.log('❌ Không tìm thấy track.controller.js');
    let code = fs.readFileSync(file, 'utf8');

    // Thêm AppError để ném lỗi chuẩn 400 (nếu chưa import)
    if (!code.includes("require('../utils/AppError')")) {
        code = "const AppError = require('../utils/AppError');\n" + code;
    }

    // Bổ sung logic kiểm tra req.body.code vào đầu hàm heartbeat
    const heartbeatRegex = /heartbeat\s*\(\s*req\s*,\s*res\s*\)\s*\{/;
    if (code.match(heartbeatRegex) && !code.includes('Mã công trình không hợp lệ')) {
        code = code.replace(
            heartbeatRegex, 
            `heartbeat(req, res) {\n        const { code } = req.body;\n        if (!code || typeof code !== 'string' || !/^[A-Z0-9_-]+$/.test(code)) {\n            throw new AppError(400, 'Mã công trình không hợp lệ');\n        }`
        );
        fs.writeFileSync(file, code);
        console.log('✅ Đã vá lỗi validation cho hàm heartbeat trong track.controller.js');
    } else {
        console.log('⚠️ Hàm heartbeat đã có validation, bỏ qua.');
    }
}

try {
    fixAdminRoutes();
    fixTrackController();
    console.log('\n🚀 Vá lỗi xong! Hãy chạy lại lệnh "npm test".');
} catch (e) {
    console.error('❌ Lỗi kịch bản:', e.message);
}