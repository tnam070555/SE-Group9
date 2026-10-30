// fix-system.js
const fs = require('fs');
const path = require('path');

const p = (...parts) => path.join(process.cwd(), ...parts);

function fixAppJs() {
    let appJs = fs.readFileSync(p('app.js'), 'utf8');

    // 1. Thêm trackRoutes
    if (!appJs.includes("const trackRoutes = require('./routers/track.routes');")) {
        appJs = appJs.replace(
            "const languageRoutes = require('./routers/language.routes');",
            "const languageRoutes = require('./routers/language.routes');\nconst trackRoutes = require('./routers/track.routes');"
        );
    }
    if (!appJs.includes("app.use('/api/track', trackRoutes);")) {
        appJs = appJs.replace(
            "app.use('/api/languages', languageRoutes);",
            "app.use('/api/languages', languageRoutes);\napp.use('/api/track', trackRoutes);"
        );
    }

    // 2. Xóa bộ đếm IP thủ công (để dùng chung với hệ thống tracking chuẩn)
    const blockToRemove = /\/\/ Bộ nhớ tạm lưu thời gian hoạt động cuối cùng của từng IP[\s\S]*?res\.json\(\{ success: true, count: onlineCount \}\);\n\}\);/m;
    appJs = appJs.replace(blockToRemove, '');

    fs.writeFileSync(p('app.js'), appJs);
    console.log('✅ Đã sửa app.js: Gắn /api/track và xóa bộ đếm cũ.');
}

function fixArtifactService() {
    const file = p('services', 'artifact.service.js');
    if (fs.existsSync(file)) {
        let code = fs.readFileSync(file, 'utf8');
        // Tìm chuỗi IP cứng kiểu 'http://192.168.31.108:5000' và thay bằng biến môi trường
        code = code.replace(/['"]http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d{4}['"]/g, "process.env.PUBLIC_BASE_URL || 'http://localhost:5000'");
        fs.writeFileSync(file, code);
        console.log('✅ Đã sửa artifact.service.js: Thay IP cứng bằng PUBLIC_BASE_URL.');
    } else {
        console.log('⚠️ Không tìm thấy services/artifact.service.js, vui lòng kiểm tra lại.');
    }
}

function removeUnusedFiles() {
    const files = ['.github/workflows/ci-cd.yml', 'apply-tracking.js'];
    for (const f of files) {
        if (fs.existsSync(p(f))) {
            fs.unlinkSync(p(f));
            console.log(`✅ Đã xóa file thừa: ${f}`);
        }
    }
}

try {
    fixAppJs();
    fixArtifactService();
    removeUnusedFiles();
    console.log('\n🚀 Hoàn tất! Hãy chạy lại "npm test" xem kết quả nhé.');
} catch (e) {
    console.error('❌ Lỗi:', e.message);
}