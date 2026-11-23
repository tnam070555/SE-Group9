// Mở khóa tài khoản admin ngay (không phải chờ hết thời gian khóa).
// Chạy trên máy server:  npm run unlock-admin
require('dotenv').config();
const mongoose = require('mongoose');
const adminRepository = require('./repositories/admin.repository');

async function main() {
    if (!process.env.MONGO_URI) {
        console.error('Thiếu MONGO_URI trong .env');
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
    const result = await adminRepository.unlockAll();
    console.log(`Đã mở khóa ${result.modifiedCount} tài khoản admin.`);
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error('Mở khóa thất bại:', err.message);
    process.exit(1);
});
