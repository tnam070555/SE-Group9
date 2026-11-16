require('dotenv').config();
const { MongoClient } = require('mongodb');
const buildingsData = require('./data/buildings.seed'); // Import 16 công trình từ thư mục data
const categoriesData = require('./data/categories.seed'); // 6 khu vực (slug khớp categorySlug của công trình)
const { DEFAULT_LANGUAGES } = require('./config/languages');

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
    const now = new Date();
    await categoriesCol.insertMany(categoriesData.map((c) => ({ ...c, isActive: true, createdAt: now, updatedAt: now })));
    console.log('📂 Đã nạp xong các danh mục (Categories)!');

    // 2. Nạp Languages (Ngôn ngữ)
    const languagesCol = db.collection('languages');
    await languagesCol.deleteMany({});
    await languagesCol.insertMany(DEFAULT_LANGUAGES.map((l, order) => ({
      code: l.code, name: l.label, speech: l.speech, provider: l.provider, isActive: true, order, createdAt: now, updatedAt: now,
    })));
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