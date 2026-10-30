require('dotenv').config();
const { MongoClient } = require('mongodb');
const buildingsData = require('./data/buildings.seed');

async function runFullAtlasSeed() {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('❌ Không tìm thấy biến MONGO_URI trong file .env!');
    process.exit(1);
  }

  console.log('🔄 Đang kết nối tới MongoDB Atlas...');
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('📦 Đã kết nối thành công tới MongoDB Atlas!');

    const db = client.db(); // Tự động lấy database từ URI (BaoTangDB)

    // 1. Seed Categories (Khu vực & Phân loại)
    const categoriesCollection = db.collection('categories');
    await categoriesCollection.deleteMany({});
    const categoriesData = [
      { name: 'Tầng trệt', slug: 'tang-tret', description: 'Khu vực khánh tiết và tiếp tân chính' },
      { name: 'Lầu 1', slug: 'lau-1', description: 'Khu vực phòng họp hội đồng và làm việc' },
      { name: 'Lầu 2', slug: 'lau-2', description: 'Phòng trình quốc thư và sinh hoạt' },
      { name: 'Tầng sân thượng', slug: 'san-thuong', description: 'Khu vực bến đáp trực thăng' },
      { name: 'Tầng hầm', slug: 'tang-ham', description: 'Hầm tác chiến và thông tin liên lạc' },
      { name: 'Khuôn viên ngoài trời', slug: 'ngoai-troi', description: 'Khu trưng bày xe tăng và cổng chính' }
    ];
    await categoriesCollection.insertMany(categoriesData);
    console.log('📂 Đã nạp thành công dữ liệu vào bảng categories!');

    // 2. Seed Languages (Ngôn ngữ hỗ trợ)
    const languagesCollection = db.collection('languages');
    await languagesCollection.deleteMany({});
    const languagesData = [
      { code: 'vi', name: 'Tiếng Việt', isDefault: true },
      { code: 'en', name: 'English', isDefault: false },
      { code: 'ja', name: '日本語', isDefault: false },
      { code: 'ko', name: '한국어', isDefault: false },
      { code: 'zh', name: '中文', isDefault: false }
    ];
    await languagesCollection.insertMany(languagesData);
    console.log('🌐 Đã nạp thành công dữ liệu vào bảng languages!');

    // 3. Seed Artifacts (Hiện vật & Công trình)
    const artifactsCollection = db.collection('artifacts');
    await artifactsCollection.deleteMany({});
    const artifactResult = await artifactsCollection.insertMany(buildingsData);
    console.log(`🏛️ Đã nạp thành công ${artifactResult.insertedCount} công trình vào bảng artifacts!`);

    // 4. Seed Events (Sự kiện / Triển lãm)
    const eventsCollection = db.collection('events');
    const existingEvents = await eventsCollection.countDocuments();
    if (existingEvents === 0) {
      await eventsCollection.insertMany([
        {
          title: 'Triển lãm Kỷ niệm Ngày Giải phóng miền Nam 30/4',
          startDate: new Date('2026-04-25'),
          endDate: new Date('2026-05-05'),
          description: 'Trưng bày tư liệu lịch sử và hình ảnh về chiến dịch Hồ Chí Minh lịch sử tại Dinh Độc Lập.'
        }
      ]);
      console.log('📅 Đã nạp sự kiện mẫu vào bảng events!');
    }

    console.log('✨ HOÀN TẤT! Toàn bộ các bảng dữ liệu đã được cập nhật thành công lên MongoDB Atlas.');

  } catch (error) {
    console.error('❌ Lỗi kết nối hoặc nạp dữ liệu:', error);
  } finally {
    await client.close();
    process.exit(0);
  }
}

runFullAtlasSeed();