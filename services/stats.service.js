const viewRepository = require('../repositories/view.repository');
const artifactRepository = require('../repositories/artifact.repository');
const feedbackRepository = require('../repositories/feedback.repository');
const presenceService = require('./presence.service');
const AppError = require('../utils/AppError');
const { LANGUAGES, parseLanguage } = require('../config/languages');

const EVENT_TYPES = ['view', 'play'];

// Số liệu theo ngày/tháng tính theo giờ Việt Nam (UTC+7, không có giờ mùa hè)
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const VN_TIMEZONE = '+07:00';
const DAY_MS = 24 * 60 * 60 * 1000;
// Biểu đồ cho phép xem 7 / 30 / 90 ngày (bản ghi lượt xem tự xóa sau 90 ngày)
const CHART_DAYS = [7, 30, 90];

// Ngày dạng 'YYYY-MM-DD' theo giờ Việt Nam
function vnDayKey(date) {
    return new Date(date.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

// Thời điểm 00:00 (giờ VN) của ngày chứa `date`
function vnStartOfDay(date) {
    const shifted = new Date(date.getTime() + VN_OFFSET_MS);
    return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - VN_OFFSET_MS);
}

// Thời điểm 00:00 ngày 1 (giờ VN) của tháng hiện tại + monthOffset
function vnStartOfMonth(date, monthOffset = 0) {
    const shifted = new Date(date.getTime() + VN_OFFSET_MS);
    return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + monthOffset, 1) - VN_OFFSET_MS);
}

// Gom các dòng { _id: { key, type }, count } thành { key: { views, plays } }
function fold(rows) {
    const result = new Map();
    for (const row of rows) {
        const entry = result.get(row._id.key) || { views: 0, plays: 0 };
        if (row._id.type === 'view') entry.views += row.count;
        if (row._id.type === 'play') entry.plays += row.count;
        result.set(row._id.key, entry);
    }
    return result;
}

class StatsService {
    // Thiết bị báo "tôi còn đang xem"
    // client: { ip, userAgent, page } để lưu vào collection device_sessions
    heartbeat(deviceId, client) {
        return presenceService.touch(deviceId, client);
    }

    // Thiết bị báo đã rời trang
    disconnect(deviceId) {
        return presenceService.remove(deviceId);
    }

    // Danh sách thiết bị đang truy cập (cho admin)
    async getOnlineDevices() {
        const devices = await presenceService.listOnline();
        return devices.map((d) => ({
            deviceId: d.deviceId, ip: d.ip, deviceType: d.deviceType, os: d.os, browser: d.browser,
            page: d.page, firstSeen: d.firstSeen, lastSeen: d.lastSeen,
        }));
    }

    // Ghi một lượt xem (view) hoặc lượt nghe (play)
    async recordEvent(body) {
        const { code, language, type } = body || {};
        if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{1,50}$/.test(code)) throw new AppError(400, 'Mã công trình không hợp lệ');
        if (!EVENT_TYPES.includes(type)) throw new AppError(400, 'type phải là view hoặc play');
        const lang = parseLanguage(language);

        // Chỉ ghi cho công trình có thật, tránh rác trong database
        const artifact = await artifactRepository.findByCode(code.toUpperCase());
        if (!artifact) throw new AppError(404, 'Không tìm thấy công trình');

        await viewRepository.create({ code: artifact.code, language: lang, type });
    }

    // Số liệu cho admin
    getOnlineCount() {
        return presenceService.countOnline();
    }

    async getStats({ days } = {}) {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - DAY_MS);
        const chartDays = CHART_DAYS.includes(Number(days)) ? Number(days) : 7;
        const chartFrom = new Date(vnStartOfDay(now).getTime() - (chartDays - 1) * DAY_MS);
        const thisMonth = vnStartOfMonth(now);
        const lastMonth = vnStartOfMonth(now, -1);

        const [byCode, byLanguage, artifacts, viewsLast24Hours, daily,
            scansThisMonth, scansLastMonth, playsThisMonth, rating, onlineNow] = await Promise.all([
            viewRepository.countGroupedBy('code'),
            viewRepository.countGroupedBy('language'),
            artifactRepository.findAll(),
            viewRepository.countViewsSince(dayAgo),
            viewRepository.countDailySince(chartFrom, VN_TIMEZONE),
            viewRepository.countBetween('view', thisMonth),
            viewRepository.countBetween('view', lastMonth, thisMonth),
            viewRepository.countBetween('play', thisMonth),
            feedbackRepository.getRatingSummary(),
            presenceService.countOnline(),
        ]);

        // Đủ mọi ngày trong khoảng, ngày không có dữ liệu = 0
        const dailyMap = fold(daily.map((r) => ({ _id: { key: r._id.day, type: r._id.type }, count: r.count })));
        const dailySeries = [];
        for (let i = 0; i < chartDays; i++) {
            const day = vnDayKey(new Date(chartFrom.getTime() + i * DAY_MS));
            dailySeries.push({ date: day, ...(dailyMap.get(day) || { views: 0, plays: 0 }) });
        }

        const codeStats = fold(byCode);
        const languageStats = fold(byLanguage);
        const totals = { views: 0, plays: 0 };
        for (const { views, plays } of codeStats.values()) {
            totals.views += views;
            totals.plays += plays;
        }

        const buildings = artifacts.map((a) => ({
            code: a.code, name: a.name, ...(codeStats.get(a.code) || { views: 0, plays: 0 }),
        })).sort((a, b) => b.views - a.views || a.code.localeCompare(b.code));

        const languages = LANGUAGES.map((l) => ({
            language: l.code, label: l.label, ...(languageStats.get(l.code) || { views: 0, plays: 0 }),
        }));

        return {
            onlineNow,
            onlineWindowSeconds: presenceService.ONLINE_WINDOW_MS / 1000,
            totals,
            viewsLast24Hours,
            month: { scans: scansThisMonth, scansLastMonth, plays: playsThisMonth },
            rating: {
                average: rating.average === null ? null : Math.round(rating.average * 10) / 10,
                count: rating.count,
            },
            chartDays,
            daily: dailySeries,
            byBuilding: buildings,
            byLanguage: languages,
        };
    }
}

module.exports = new StatsService();
