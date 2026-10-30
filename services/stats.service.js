const viewRepository = require('../repositories/view.repository');
const artifactRepository = require('../repositories/artifact.repository');
const presenceService = require('./presence.service');
const AppError = require('../utils/AppError');
const { LANGUAGES, parseLanguage } = require('../config/languages');

const EVENT_TYPES = ['view', 'play'];

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
    heartbeat(deviceId) {
        presenceService.touch(deviceId);
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
    async getStats() {
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [byCode, byLanguage, artifacts, viewsLast24Hours] = await Promise.all([
            viewRepository.countGroupedBy('code'),
            viewRepository.countGroupedBy('language'),
            artifactRepository.findAll(),
            viewRepository.countViewsSince(dayAgo),
        ]);

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
            onlineNow: presenceService.countOnline(),
            onlineWindowSeconds: presenceService.ONLINE_WINDOW_MS / 1000,
            totals,
            viewsLast24Hours,
            byBuilding: buildings,
            byLanguage: languages,
        };
    }
}

module.exports = new StatsService();
