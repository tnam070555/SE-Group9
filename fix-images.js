// Script cập nhật imageUrl cho tất cả artifacts trong DB: gán ảnh đúng từng phòng (public/img/rooms, nguồn ở CREDITS.md).
// DDL-15, DDL-16 chưa có ảnh nên không có trong danh sách. Server khởi động cũng tự sửa ảnh mặt tiền chung (seed.service).
// Chạy 1 lần: node fix-images.js
require('dotenv').config();
const mongoose = require('mongoose');
const Artifact = require('./models/artifact.model');

const IMAGE_MAP = {
  'DDL-01': '/img/rooms/ddl-01.jpg',
  'DDL-02': '/img/rooms/ddl-02.jpg',
  'DDL-03': '/img/rooms/ddl-03.jpg',
  'DDL-04': '/img/rooms/ddl-04.jpg',
  'DDL-05': '/img/rooms/ddl-05.jpg',
  'DDL-06': '/img/rooms/ddl-06.jpg',
  'DDL-07': '/img/rooms/ddl-07.jpg',
  'DDL-08': '/img/rooms/ddl-08.jpg',
  'DDL-09': '/img/rooms/ddl-09.jpg',
  'DDL-10': '/img/rooms/ddl-10.jpg',
  'DDL-11': '/img/rooms/ddl-11.jpg',
  'DDL-12': '/img/rooms/ddl-12.jpg',
  'DDL-13': '/img/rooms/ddl-13.jpg',
  'DDL-14': '/img/rooms/ddl-14.jpg',
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  for (const [code, imageUrl] of Object.entries(IMAGE_MAP)) {
    const result = await Artifact.findOneAndUpdate(
      { code },
      { $set: { imageUrl } },
      { new: true }
    );
    console.log(result ? `✓ ${code} → ${imageUrl}` : `✗ ${code}: not found`);
  }

  await mongoose.disconnect();
  console.log('Done!');
}

run().catch(console.error);
