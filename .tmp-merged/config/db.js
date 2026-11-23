const mongoose = require('mongoose');

// Kết nối database: MongoDB thật (MONGO_URI) hoặc MongoDB trong RAM để chạy thử
async function connectDB() {
    if (process.env.USE_MEMORY_DB === 'true') {
        // Chỉ nạp thư viện này khi cần (nó là devDependency)
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const memoryServer = await MongoMemoryServer.create();
        await mongoose.connect(memoryServer.getUri());
        console.log('Đã kết nối MongoDB trong RAM (dữ liệu sẽ mất khi tắt server).');
        return;
    }

    if (!process.env.MONGO_URI) {
        throw new Error('Thiếu MONGO_URI trong .env (hoặc đặt USE_MEMORY_DB=true để chạy thử).');
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Đã kết nối MongoDB.');
}

module.exports = connectDB;
