const AppError = require('../utils/AppError');

// Thiết bị gửi tín hiệu trong vòng ngần này mili giây được coi là "đang online"
const ONLINE_WINDOW_MS = 60 * 1000;
const MAX_DEVICES = 10000; // chặn việc gửi mã giả liên tục làm đầy bộ nhớ

// Lưu trong bộ nhớ: tắt server là reset (đúng với ý nghĩa "đang online")
const lastSeen = new Map();

function isValidId(id) {
    return typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id);
}

function cleanup(now) {
    for (const [id, time] of lastSeen) {
        if (now - time > ONLINE_WINDOW_MS) lastSeen.delete(id);
    }
}

// Ghi nhận thiết bị còn hoạt động
function touch(deviceId, now = Date.now()) {
    if (!isValidId(deviceId)) throw new AppError(400, 'deviceId không hợp lệ');
    cleanup(now);
    if (!lastSeen.has(deviceId) && lastSeen.size >= MAX_DEVICES) {
        throw new AppError(429, 'Quá nhiều thiết bị đang online');
    }
    lastSeen.set(deviceId, now);
}

function countOnline(now = Date.now()) {
    cleanup(now);
    return lastSeen.size;
}

function reset() {
    lastSeen.clear();
}

module.exports = { touch, countOnline, reset, ONLINE_WINDOW_MS, MAX_DEVICES };
