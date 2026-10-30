const statsService = require('../services/stats.service');

const activeUsers = new Map();
const TIMEOUT = 60 * 1000;

class StatsController {
    async heartbeat(req, res) {
        const clientId = (req.body && req.body.clientId) || req.ip;
        if (clientId) {
            activeUsers.set(clientId, Date.now());
        }

        try {
            if (statsService && typeof statsService.heartbeat === 'function') {
                statsService.heartbeat(req.body && req.body.deviceId);
            }
        } catch (error) {}

        res.status(204).send();
    }

    // Hàm MỚI: Xóa ngay lập tức khi người dùng đóng web
    async disconnect(req, res) {
        const clientId = req.body && req.body.clientId;
        if (clientId) {
            activeUsers.delete(clientId);
        }
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
        const now = Date.now();
        let count = 0;

        for (let [id, lastSeen] of activeUsers.entries()) {
            if (now - lastSeen > TIMEOUT) {
                activeUsers.delete(id);
            } else {
                count++;
            }
        }
        res.status(200).json({ count: count });
    }
}

module.exports = new StatsController();