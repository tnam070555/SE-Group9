const ticketService = require('../services/ticket.service');

/**
 * Controller module Tickets.
 * Dùng Express 5 – async errors tự lan đến errorHandler, KHÔNG cần try/catch.
 */
const ticketController = {
    // ---------- Công khai ----------

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

    /** POST /api/tickets/orders – tạo đơn, trả kèm mã QR thanh toán */
    createOrder: async (req, res) => {
        const result = await ticketService.createOrder(req.body);
        res.status(201).json({ success: true, data: result });
    },

    /** GET /api/tickets/orders/:id – trạng thái đơn (trang thanh toán hỏi định kỳ) */
    getOrder: async (req, res) => {
        const order = await ticketService.getOrder(req.params.id);
        res.json({ success: true, data: order });
    },

    /** GET /api/tickets/:code */
    getByCode: async (req, res) => {
        const ticket = await ticketService.getTicketByCode(req.params.code);
        res.json({ success: true, data: ticket });
    },

    // ---------- Admin ----------

    /** GET /api/admin/tickets/orders?status=pending|paid|closed|all */
    listOrders: async (req, res) => {
        const data = await ticketService.listOrders(req.query);
        res.json({ success: true, data });
    },

    /** POST /api/admin/tickets/orders/:id/confirm – xác nhận đã nhận tiền */
    confirmPayment: async (req, res) => {
        const order = await ticketService.confirmPayment(req.params.id);
        res.json({ success: true, data: order });
    },

    /** POST /api/admin/tickets/orders/:id/cancel – hủy đơn, trả lại chỗ */
    cancelOrder: async (req, res) => {
        const order = await ticketService.cancelOrder(req.params.id);
        res.json({ success: true, data: order });
    },
};

module.exports = ticketController;
