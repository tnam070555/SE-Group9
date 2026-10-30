require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const adminService = require('./services/admin.service');
const seedService = require('./services/seed.service');

// Nhúng toàn bộ các model để khởi tạo bảng trên MongoDB
const Category = require('./models/category.model'); 
const Language = require('./models/language.model');
const Feedback = require('./models/feedback.model');
const ScanLog = require('./models/scan_log.model');
const Event = require('./models/event.model');
// Cần model Artifact để lấy ID liên kết cho Feedback và ScanLog
const Artifact = require('./models/artifact.model'); 

const PORT = process.env.PORT || 5000;

async function startServer() {
    if (!process.env.JWT_SECRET) {
        throw new Error('Thiếu JWT_SECRET trong .env, server không khởi động.');
    }

    await connectDB();

    const adminStatus = await adminService.ensureAdminFromEnv();
    if (adminStatus === 'created') console.log('Đã tạo tài khoản admin từ .env');

    // Nạp dữ liệu công trình trước để có Artifact ID liên kết
    const seeded = await seedService.syncSampleData();
    if (seeded.created) console.log(`Đã nạp ${seeded.created} công trình mẫu (kèm bản dịch).`);
    if (seeded.updated) console.log(`Đã bổ sung bản dịch cho ${seeded.updated} công trình mẫu.`);

    // =========================================================================
    // KHỞI TẠO DỮ LIỆU MẪU CHO TẤT CẢ CÁC BẢNG CÒN LẠI
    // =========================================================================
    try {
        if (await Category.countDocuments() === 0) {
            await Category.create({ name: 'Tầng trệt', description: 'Khu vực trưng bày chính tại Dinh Độc Lập' });
            console.log('Đã tạo bảng categories!');
        }
        if (await Language.countDocuments() === 0) {
            await Language.create({ code: 'vi', name: 'Tiếng Việt' });
            await Language.create({ code: 'en', name: 'English' });
            console.log('Đã tạo bảng languages!');
        }
        if (await Event.countDocuments() === 0) {
            await Event.create({ title: 'Triển lãm Kỷ niệm 30/4', description: 'Trưng bày chuyên đề tại Dinh Độc Lập' });
            console.log('Đã tạo bảng events!');
        }

        // Lấy 1 công trình ngẫu nhiên để tạo liên kết (khóa ngoại)
        const sampleArtifact = await Artifact.findOne();
        if (sampleArtifact) {
            if (await Feedback.countDocuments() === 0) {
                await Feedback.create({ 
                    artifactId: sampleArtifact._id, 
                    rating: 5, 
                    comment: 'Hệ thống thuyết minh rất rõ ràng và hữu ích!' 
                });
                console.log('Đã tạo bảng feedbacks!');
            }
            if (await ScanLog.countDocuments() === 0) {
                await ScanLog.create({ 
                    artifactId: sampleArtifact._id, 
                    deviceType: 'Mobile', 
                    os: 'iOS', 
                    languageSelected: 'vi' 
                });
                console.log('Đã tạo bảng scan_logs!');
            }
        }
    } catch (error) {
        console.error('Lỗi khi khởi tạo các bảng mới:', error.message);
    }
    // =========================================================================

    app.listen(PORT, () => {
        console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
}

startServer().catch((error) => {
    console.error('Lỗi khởi động server:', error.message);
    process.exit(1);
});