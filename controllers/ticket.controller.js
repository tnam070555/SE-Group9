const ticketService = require('../services/ticket.service');

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
        const result = await ticketService.createOrder(req.body);
        res.status(201).json({ success: true, data: result });
    },

    /** GET /api/tickets/:code */
    getByCode: async (req, res) => {
        const ticket = await ticketService.getTicketByCode(req.params.code);
        res.json({ success: true, data: ticket });
    },
};

module.exports = ticketController;
