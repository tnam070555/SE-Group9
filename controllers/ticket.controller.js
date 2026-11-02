const ticketService = require('../services/ticket.service');
const ticketOrderRepository = require('../repositories/ticketOrder.repository');

// Địa chỉ gốc cho mã QR trên vé: PUBLIC_BASE_URL -> CLIENT_URL -> địa chỉ đang truy cập
function baseUrlOf(req) {
    const raw = process.env.PUBLIC_BASE_URL || process.env.CLIENT_URL || `${req.protocol}://${req.get('host')}`;
    try { return new URL(raw).origin; } catch (e) { return `${req.protocol}://${req.get('host')}`; }
}

/**
 * Controller module Tickets.
 * Dùng Express 5 – async errors tự lan đến errorHandler, KHÔNG cần try/catch.
 */
const ticketController = {
    /** GET /api/tickets/types */
    getTypes: async (req, res) => {
        const types = await ticketService.getTicketTypes();
        res.json({ success: true, data: types });
    },

    /** GET /api/tickets/slots?date=YYYY-MM-DD */
    getSlots: async (req, res) => {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, message: 'Thiếu tham số date' });
        }
        const slots = await ticketService.getSlotsByDate(date);
        res.json({ success: true, data: slots });
    },

    /** POST /api/tickets/orders */
    createOrder: async (req, res) => {
        const result = await ticketService.createOrder(req.body, baseUrlOf(req));
        res.status(201).json({ success: true, data: result });
    },

    /** GET /api/tickets/orders – admin only, xem danh sách đơn đặt */
    getOrders: async (req, res) => {
        const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
        const skip   = parseInt(req.query.skip) || 0;
        const orders = await ticketOrderRepository.findAll({}, limit, skip);
        res.json({ success: true, data: orders });
    },

    /** GET /api/tickets/:code */
    getByCode: async (req, res) => {
        const ticket = await ticketService.getTicketByCode(req.params.code, baseUrlOf(req));
        res.json({ success: true, data: ticket });
    },
};

module.exports = ticketController;
