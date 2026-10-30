require('dotenv').config();
const { MongoClient } = require('mongodb');
const buildingsData = require('./data/buildings.seed'); // Import 16 công trình từ thư mục data

async function runSeed() {
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

    const db = client.db(); // Tự động nhận database từ chuỗi kết nối trong .env (BaoTangDB)

    // 1. Nạp Categories (Danh mục tầng/khu vực)
    const categoriesCol = db.collection('categories');
    await categoriesCol.deleteMany({});
    await categoriesCol.insertMany([
      { name: 'Tầng trệt', slug: 'tang-tret' },
      { name: 'Lầu 1', slug: 'lau-1' },
      { name: 'Lầu 2', slug: 'lau-2' },
      { name: 'Tầng sân thượng', slug: 'san-thuong' },
      { name: 'Tầng hầm', slug: 'tang-ham' },
      { name: 'Khuôn viên ngoài trời', slug: 'ngoai-troi' }
    ]);
    console.log('📂 Đã nạp xong các danh mục (Categories)!');

    // 2. Nạp Languages (Ngôn ngữ)
    const languagesCol = db.collection('languages');
    await languagesCol.deleteMany({});
    await languagesCol.insertMany([
      { code: 'vi', name: 'Tiếng Việt', isDefault: true },
      { code: 'en', name: 'English', isDefault: false },
      { code: 'ja', name: '日本語', isDefault: false },
      { code: 'ko', name: '한국어', isDefault: false },
      { code: 'zh', name: '中文', isDefault: false }
    ]);
    console.log('🌐 Đã nạp xong danh sách ngôn ngữ (Languages)!');

    // 3. Nạp Artifacts (16 công trình Dinh Độc Lập)
    const artifactsCol = db.collection('artifacts');
    await artifactsCol.deleteMany({});
    const result = await artifactsCol.insertMany(buildingsData);
    console.log(`✨ HOÀN TẤT! Đã nạp thành công ${result.insertedCount} công trình vào bảng artifacts!`);

  } catch (error) {
    console.error('❌ Lỗi trong quá trình seed dữ liệu:', error);
  } finally {
    await client.close();
    process.exit(0);
  }
}

runSeed();