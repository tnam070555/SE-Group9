const statsService = require('../services/stats.service');

// Lớp 1: chỉ lo HTTP. Express 5 tự chuyển lỗi bất đồng bộ sang errorHandler.
// Nguồn đếm online duy nhất: presenceService (qua statsService.heartbeat / statsService.getStats)
class StatsController {
    async heartbeat(req, res) {
        // deviceId dùng cho presence (đếm online); clientId không còn dùng riêng nữa
        await statsService.heartbeat(req.body && req.body.deviceId);
        res.status(204).send();
    }

    async disconnect(req, res) {
        // Tín hiệu ngắt kết nối tự nhiên — presence.service tự dọn khi TTL hết,
        // nên không cần xử lý thêm ở đây. Giữ endpoint để frontend không bị lỗi.
        res.status(204).send();
    }

    async trackEvent(req, res) {
        await statsService.recordEvent(req.body);
        res.status(204).send();
    }

    async getStats(req, res) {
        res.status(200).json({ success: true, data: await statsService.getStats() });
    }

    async getOnlineCount(req, res) {
        // Dùng cùng nguồn với getStats để số liệu nhất quán
        res.status(200).json({ count: statsService.getOnlineCount() });
    }
}

module.exports = new StatsController();
