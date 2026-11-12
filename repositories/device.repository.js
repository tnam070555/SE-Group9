const DeviceSession = require('../models/device_session.model');

// Điều kiện "đang truy cập": gửi tín hiệu từ `since` trở đi và chưa báo rời trang
const onlineFilter = (since) => ({ lastSeen: { $gte: since }, disconnectedAt: null });

// Ghi nhận tín hiệu: tạo mới nếu thiết bị chưa có, ngược lại cập nhật lastSeen và thông tin mới nhất
function upsertHeartbeat(deviceId, info, now) {
    return DeviceSession.updateOne(
        { deviceId },
        {
            $set: { ...info, lastSeen: now, disconnectedAt: null },
            $setOnInsert: { firstSeen: now },
        },
        { upsert: true },
    );
}

function markDisconnected(deviceId, now) {
    return DeviceSession.updateOne({ deviceId, disconnectedAt: null }, { $set: { disconnectedAt: now } });
}

function countOnline(since) {
    return DeviceSession.countDocuments(onlineFilter(since));
}

function findOnline(since, limit = 100) {
    return DeviceSession.find(onlineFilter(since)).sort({ lastSeen: -1 }).limit(limit).lean();
}

module.exports = { upsertHeartbeat, markDisconnected, countOnline, findOnline };
