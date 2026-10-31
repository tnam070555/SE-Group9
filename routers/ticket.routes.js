const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');

// Các route public (không cần đăng nhập)
router.get('/types',  ticketController.getTypes);
router.get('/slots',  ticketController.getSlots);
router.post('/orders', ticketController.createOrder);

// Admin only: xem danh sách đơn đặt
router.get('/orders', verifyToken, requireAdmin, ticketController.getOrders);

// Phải đặt CUỐI để không conflict
router.get('/:code', ticketController.getByCode);

module.exports = router;
