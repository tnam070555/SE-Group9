// Kiểm tra luồng mua vé đầy đủ trên MongoDB trong RAM:
// đặt vé → chờ thanh toán (QR giả lập) → admin xác nhận → vé có hiệu lực
const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-secret';

const app = require('../app');
const TicketType = require('../models/ticket_type.model');
const TimeSlot = require('../models/time_slot.model');
const TicketOrder = require('../models/ticket_order.model');
const ticketService = require('../services/ticket.service');

let mongo;
let server;
let base;
const adminToken = jwt.sign({ id: '1', username: 'admin', role: 'admin' }, 'test-secret', { expiresIn: '1h' });

// Ngày mai theo giờ Việt Nam (khung giờ nào cũng còn đặt được)
function tomorrow() {
    const today = ticketService._internal.nowInVietnam().date;
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
}
const DATE = tomorrow();
const SLOT = { from: '09:00', to: '10:30' };

test.before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await Promise.all([TicketType.init(), TimeSlot.init(), TicketOrder.init()]);
    await TicketType.create([
        { code: 'ADULT', name: 'Người lớn', price: 40000 },
        { code: 'CHILD', name: 'Trẻ em', price: 20000 },
        { code: 'FREE', name: 'Miễn phí', price: 0 },
    ]);
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    server.close();
    await mongoose.disconnect();
    await mongo.stop();
});

test.beforeEach(async () => {
    await TicketOrder.deleteMany({});
    await TimeSlot.deleteMany({});
});

async function call(method, path, { token, body } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
}

const order = (items, extra = {}) => call('POST', '/api/tickets/orders', { body: { date: DATE, slot: SLOT, items, ...extra } });
const slotOf = async () => TimeSlot.findOne({ date: DATE, from: SLOT.from });

test('đặt vé: đơn chờ thanh toán, có QR thanh toán, chưa có vé, đã giữ chỗ', async () => {
    const res = await order([{ type: 'ADULT', quantity: 2 }, { type: 'CHILD', quantity: 1 }], { contact: { name: 'An', phone: '0901' } });
    assert.strictEqual(res.status, 201);
    const o = res.body.data;
    assert.strictEqual(o.status, 'pending');
    assert.strictEqual(o.totalPrice, 100000);
    assert.match(o.orderCode, /^DDL[A-Z0-9]{7}$/);
    assert.match(o.payment.qr, /^data:image\/png;base64,/);
    assert.strictEqual(o.payment.amount, 100000);
    assert.ok(o.expiresAt);
    assert.deepStrictEqual(o.tickets, []); // chưa thanh toán thì chưa có vé
    assert.strictEqual((await slotOf()).booked, 3);
});

test('admin xác nhận → đơn paid, vé valid kèm QR vào cổng; xác nhận lần 2 bị từ chối', async () => {
    const o = (await order([{ type: 'ADULT', quantity: 2 }])).body.data;

    const confirm = await call('POST', `/api/admin/tickets/orders/${o.orderId}/confirm`, { token: adminToken });
    assert.strictEqual(confirm.status, 200);
    assert.strictEqual(confirm.body.data.status, 'paid');

    const after = (await call('GET', `/api/tickets/orders/${o.orderId}`)).body.data;
    assert.strictEqual(after.status, 'paid');
    assert.strictEqual(after.payment, null);
    assert.strictEqual(after.tickets.length, 2);
    for (const t of after.tickets) {
        assert.strictEqual(t.status, 'valid');
        assert.match(t.qr, /^data:image\/png;base64,/);
    }

    const lookup = await call('GET', `/api/tickets/${after.tickets[0].code.toLowerCase()}`);
    assert.strictEqual(lookup.status, 200);
    assert.strictEqual(lookup.body.data.status, 'valid');

    const again = await call('POST', `/api/admin/tickets/orders/${o.orderId}/confirm`, { token: adminToken });
    assert.strictEqual(again.status, 409);
});

test('API admin đòi đăng nhập', async () => {
    assert.strictEqual((await call('GET', '/api/admin/tickets/orders')).status, 401);
});

test('admin hủy đơn → trả lại chỗ', async () => {
    const o = (await order([{ type: 'ADULT', quantity: 4 }])).body.data;
    assert.strictEqual((await slotOf()).booked, 4);
    const res = await call('POST', `/api/admin/tickets/orders/${o.orderId}/cancel`, { token: adminToken });
    assert.strictEqual(res.status, 200);
    assert.strictEqual((await slotOf()).booked, 0);
    assert.strictEqual((await call('POST', `/api/admin/tickets/orders/${o.orderId}/confirm`, { token: adminToken })).status, 409);
});

test('đơn quá hạn thanh toán tự hủy và trả chỗ', async () => {
    const o = (await order([{ type: 'ADULT', quantity: 3 }])).body.data;
    await TicketOrder.updateOne({ _id: o.orderId }, { expiresAt: new Date(Date.now() - 1000) });

    const after = (await call('GET', `/api/tickets/orders/${o.orderId}`)).body.data;
    assert.strictEqual(after.status, 'expired');
    assert.strictEqual((await slotOf()).booked, 0);
    assert.strictEqual((await call('POST', `/api/admin/tickets/orders/${o.orderId}/confirm`, { token: adminToken })).status, 409);
});

test('đơn chỉ có vé miễn phí có hiệu lực ngay', async () => {
    const o = (await order([{ type: 'FREE', quantity: 1 }])).body.data;
    assert.strictEqual(o.status, 'paid');
    assert.strictEqual(o.tickets.length, 1);
});

test('không bán quá sức chứa, kể cả khi đặt đồng thời', async () => {
    await call('GET', `/api/tickets/slots?date=${DATE}`); // tạo khung giờ
    await TimeSlot.updateOne({ date: DATE, from: SLOT.from }, { capacity: 12 });
    const results = await Promise.all(Array.from({ length: 4 }, () => order([{ type: 'ADULT', quantity: 5 }])));
    const ok = results.filter((r) => r.status === 201).length;
    assert.strictEqual(ok, 2);
    assert.ok(results.filter((r) => r.status !== 201).every((r) => r.status === 409));
    assert.strictEqual((await slotOf()).booked, 10);
});

test('từ chối dữ liệu xấu: loại vé lạ, số lượng âm/lẻ, quá 10 vé, ngày quá khứ, khung giờ lạ', async () => {
    const bad = [
        { date: DATE, slot: SLOT, items: [{ type: 'VIP', quantity: 1 }] },
        { date: DATE, slot: SLOT, items: [{ type: 'ADULT', quantity: -1 }] },
        { date: DATE, slot: SLOT, items: [{ type: 'ADULT', quantity: 1.5 }] },
        { date: DATE, slot: SLOT, items: [{ type: 'ADULT', quantity: 6 }, { type: 'CHILD', quantity: 5 }] },
        { date: '2020-01-01', slot: SLOT, items: [{ type: 'ADULT', quantity: 1 }] },
        { date: DATE, slot: { from: '20:00', to: '21:00' }, items: [{ type: 'ADULT', quantity: 1 }] },
    ];
    for (const body of bad) {
        const res = await call('POST', '/api/tickets/orders', { body });
        assert.strictEqual(res.status, 400, JSON.stringify(body));
    }
    assert.strictEqual(await TicketOrder.countDocuments(), 0);
});

test('admin xem danh sách đơn chờ thanh toán', async () => {
    await order([{ type: 'ADULT', quantity: 1 }]);
    await order([{ type: 'FREE', quantity: 1 }]);
    const res = await call('GET', '/api/admin/tickets/orders?status=pending', { token: adminToken });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.orders.length, 1);
    assert.strictEqual(res.body.data.pendingCount, 1);
});
