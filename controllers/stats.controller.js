const statsService = require('../services/stats.service');

// Lớp 1: chỉ lo HTTP. Express 5 tự chuyển lỗi bất đồng bộ sang errorHandler.
// Nguồn đếm online duy nhất: collection device_sessions trong MongoDB (qua presence.service)
class StatsController {
    async heartbeat(req, res) {
        const body = req.body || {};
        await statsService.heartbeat(body.deviceId, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            page: body.page,
        });
        res.status(204).send();
    }

    async disconnect(req, res) {
        // Thiết bị đóng tab: bỏ đếm ngay. Nếu tín hiệu không tới, thiết bị vẫn hết "online" sau 60 giây.
        await statsService.disconnect(req.body && req.body.deviceId);
        res.status(204).send();
    }

    async trackEvent(req, res) {
        await statsService.recordEvent(req.body);
        res.status(204).send();
    }

    async getStats(req, res) {
        res.status(200).json({ success: true, data: await statsService.getStats({ days: req.query.days }) });
    }

    async getOnlineCount(req, res) {
        res.status(200).json({ count: await statsService.getOnlineCount() });
    }

    async getOnlineDevices(req, res) {
        res.status(200).json({ success: true, data: await statsService.getOnlineDevices() });
    }
}

module.exports = new StatsController();
