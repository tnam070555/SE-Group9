const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const rateLimit = require('../middlewares/rateLimit.middleware');

// Các route này là public (không cần đăng nhập)
router.get('/types',      ticketController.getTypes);
router.get('/slots',      ticketController.getSlots);
// Giới hạn tạo đơn: mỗi đơn giữ chỗ 15 phút, không giới hạn thì một người có thể giữ hết chỗ
router.post('/orders',    rateLimit({ windowMs: 10 * 60 * 1000, max: 20 }), ticketController.createOrder);
router.get('/orders/:id', ticketController.getOrder);
router.get('/:code',      ticketController.getByCode);  // Phải đặt CUỐI để không conflict

module.exports = router;
