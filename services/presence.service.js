const AppError = require('../utils/AppError');
const deviceRepository = require('../repositories/device.repository');

// Thiết bị gửi tín hiệu trong vòng ngần này mili giây được coi là "đang online"
const ONLINE_WINDOW_MS = 60 * 1000;

// Lưu trong MongoDB, collection "device_sessions" (xem models/device_session.model.js)

function isValidId(id) {
    return typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id);
}

// "::ffff:192.168.1.5" -> "192.168.1.5"; "::1" -> "127.0.0.1 (máy chủ)"
function normalizeIp(ip) {
    if (!ip) return '';
    if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') return '127.0.0.1 (máy chủ)';
    return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

// Nhận dạng sơ bộ loại thiết bị / hệ điều hành / trình duyệt từ User-Agent
function parseUserAgent(ua = '') {
    const os = /Android/i.test(ua) ? 'Android'
        : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
        : /Windows/i.test(ua) ? 'Windows'
        : /Mac OS X|Macintosh/i.test(ua) ? 'macOS'
        : /Linux/i.test(ua) ? 'Linux' : 'Khác';
    const deviceType = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'Tablet'
        : /Mobi|iPhone|iPod|Android/i.test(ua) ? 'Mobile' : 'Desktop';
    const browser = /Edg\//.test(ua) ? 'Edge'
        : /OPR\/|Opera/.test(ua) ? 'Opera'
        : /SamsungBrowser/.test(ua) ? 'Samsung Internet'
        : /CocCoc/i.test(ua) ? 'Cốc Cốc'
        : /Firefox|FxiOS/.test(ua) ? 'Firefox'
        : /Chrome|CriOS/.test(ua) ? 'Chrome'
        : /Safari/.test(ua) ? 'Safari' : 'Khác';
    return { deviceType, os, browser };
}

function cleanPage(page) {
    return typeof page === 'string' && /^\/[\w./-]{0,100}$/.test(page) ? page : undefined;
}

// Ghi nhận thiết bị còn hoạt động. client: { ip, userAgent, page }
async function touch(deviceId, client = {}, now = new Date()) {
    if (!isValidId(deviceId)) throw new AppError(400, 'deviceId không hợp lệ');
    const userAgent = typeof client.userAgent === 'string' ? client.userAgent.slice(0, 300) : '';
    const info = { ip: normalizeIp(client.ip), userAgent, ...parseUserAgent(userAgent) };
    const page = cleanPage(client.page);
    if (page) info.page = page;
    await deviceRepository.upsertHeartbeat(deviceId, info, now);
}

// Thiết bị báo đã rời trang (đóng tab) -> bỏ đếm ngay, không chờ hết ONLINE_WINDOW_MS
async function remove(deviceId, now = new Date()) {
    if (isValidId(deviceId)) await deviceRepository.markDisconnected(deviceId, now);
}

function countOnline(now = new Date()) {
    return deviceRepository.countOnline(new Date(now.getTime() - ONLINE_WINDOW_MS));
}

function listOnline(now = new Date()) {
    return deviceRepository.findOnline(new Date(now.getTime() - ONLINE_WINDOW_MS));
}

module.exports = { touch, remove, countOnline, listOnline, isValidId, normalizeIp, parseUserAgent, ONLINE_WINDOW_MS };
