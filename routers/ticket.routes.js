const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');

// Các route này là public (không cần đăng nhập)
router.get('/types',   ticketController.getTypes);
router.get('/slots',   ticketController.getSlots);
router.post('/orders', ticketController.createOrder);
router.get('/:code',   ticketController.getByCode);  // Phải đặt CUỐI để không conflict

module.exports = router;
