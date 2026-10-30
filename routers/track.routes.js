const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const rateLimit = require('../middlewares/rateLimit.middleware');

router.use(rateLimit({ max: Number(process.env.TRACK_RATE_LIMIT_MAX) || 600 }));

router.post('/heartbeat', statsController.heartbeat);
router.post('/event', statsController.trackEvent);
router.get('/online-count', statsController.getOnlineCount);

// ĐƯỜNG DẪN MỚI: Báo cáo ngắt kết nối
router.post('/disconnect', statsController.disconnect);

module.exports = router;