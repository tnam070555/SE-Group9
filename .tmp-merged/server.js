require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const adminService = require('./services/admin.service');
const seedService = require('./services/seed.service');
const languageService = require('./services/language.service');
const categoryService = require('./services/category.service');

// Nhúng toàn bộ các model để khởi tạo bảng trên MongoDB
const Feedback = require('./models/feedback.model');
const ScanLog = require('./models/scan_log.model');
const Event = require('./models/event.model');
// Cần model Artifact để lấy ID liên kết cho Feedback và ScanLog
const Artifact = require('./models/artifact.model');
// Models module Tickets (đăng ký schema trước khi server chạy)
const TicketType  = require('./models/ticket_type.model');
const TimeSlot    = require('./models/time_slot.model');
const TicketOrder = require('./models/ticket_order.model');
// Thiết bị đang truy cập (đếm "Đang truy cập" ở trang admin)
const DeviceSession = require('./models/device_session.model');

const PORT = process.env.PORT || 5000;

async function startServer() {
    if (!process.env.JWT_SECRET) {
        throw new Error('Thiếu JWT_SECRET trong .env, server không khởi động.');
    }

    await connectDB();

    const adminStatus = await adminService.ensureAdminFromEnv();
    if (adminStatus === 'created') console.log('Đã tạo tài khoản admin từ .env');

    // Ngôn ngữ hỗ trợ: đọc từ database (database cũ được bổ sung đủ 5 ngôn ngữ mặc định)
    await languageService.syncDefaults();
    // Khu vực: database chưa có khu vực mang mã (slug) thì tạo 6 khu vực mặc định
    const createdAreas = await categoryService.syncDefaults();
    if (createdAreas) console.log(`Đã tạo ${createdAreas} khu vực mặc định.`);

    // Nạp dữ liệu công trình trước để có Artifact ID liên kết
    const seeded = await seedService.syncSampleData();
    if (seeded.created) console.log(`Đã nạp ${seeded.created} công trình mẫu (kèm bản dịch).`);
    if (seeded.updated) console.log(`Đã bổ sung bản dịch cho ${seeded.updated} công trình mẫu.`);

    // Lưu mã QR của từng công trình vào MongoDB (trường qrLink, qrImage)
    const qrUpdated = await require('./services/artifact.service').syncQrCodes();
    if (qrUpdated) console.log(`Đã tạo/cập nhật mã QR cho ${qrUpdated} công trình.`);

    // =========================================================================
    // KHỞI TẠO DỮ LIỆU MẪU CHO TẤT CẢ CÁC BẢNG CÒN LẠI
    // =========================================================================
    try {
        // Tạo sẵn collection device_sessions (kèm index) để xem được trong MongoDB Compass ngay cả khi chưa có ai truy cập
        await DeviceSession.createCollection().catch(() => {});
        await DeviceSession.syncIndexes();

        // Seed dữ liệu loại vé nếu chưa có
        if (await TicketType.countDocuments() === 0) {
            await TicketType.create({ code: 'ADULT',   name: 'Người lớn',             description: 'Từ 16 tuổi trở lên',                                               price: 40000 });
            await TicketType.create({ code: 'CHILD',   name: 'Trẻ em',                description: 'Từ 6 đến 15 tuổi',                                                  price: 20000 });
            await TicketType.create({ code: 'STUDENT', name: 'Học sinh / Sinh viên',  description: 'Có thẻ học sinh hoặc thẻ sinh viên hợp lệ',                         price: 10000 });
            await TicketType.create({ code: 'FREE',    name: 'Miễn phí',              description: 'Trẻ em dưới 6 tuổi, người cao tuổi từ 70 tuổi, người khuyết tật',   price: 0 });
            console.log('Đã tạo dữ liệu loại vé (TicketTypes)!');
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
        const lanUrl = require('./utils/network').getPublicBaseUrl(PORT);
        if (lanUrl) console.log(`Điện thoại/máy khác (cùng Wi-Fi) truy cập: ${lanUrl}`);
        else console.log('Không tìm thấy IP mạng LAN. Hãy kết nối Wi-Fi hoặc đặt PUBLIC_BASE_URL trong .env.');
    });
}

startServer().catch((error) => {
    console.error('Lỗi khởi động server:', error.message);
    process.exit(1);
});