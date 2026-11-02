const test = require('node:test');
const assert = require('node:assert');

const ticketService = require('../services/ticket.service');
const ticketTypeRepo = require('../repositories/ticketType.repository');
const timeSlotRepo = require('../repositories/timeSlot.repository');
const orderRepo = require('../repositories/ticketOrder.repository');

const TYPES = [
    { code: 'FREE', price: 0 }, { code: 'STUDENT', price: 10000 },
    { code: 'CHILD', price: 20000 }, { code: 'ADULT', price: 40000 },
];
const BASE = 'http://192.168.1.10:5000';

function dayOffset(n) {
    const d = new Date(); d.setDate(d.getDate() + n);
    const pad = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Giả lập repository: khung giờ trong bộ nhớ, reserve() có điều kiện như MongoDB
function mockRepos(t, { capacity = 50, booked = 0, failCreate = false } = {}) {
    const slot = { capacity, booked };
    const saved = [];
    t.mock.method(ticketTypeRepo, 'findAllActive', async () => TYPES);
    t.mock.method(timeSlotRepo, 'countByDate', async () => 5);
    t.mock.method(timeSlotRepo, 'insertMany', async () => []);
    t.mock.method(timeSlotRepo, 'reserve', async (date, from, qty) => {
        if (slot.booked + qty > slot.capacity) return null;
        slot.booked += qty; return { ...slot };
    });
    t.mock.method(timeSlotRepo, 'release', async (date, from, qty) => { slot.booked -= qty; return { ...slot }; });
    t.mock.method(orderRepo, 'create', async (data) => {
        if (failCreate) throw new Error('db down');
        saved.push(data); return { _id: 'o1', ...data };
    });
    return { slot, saved };
}

const order = (over = {}) => ({
    date: dayOffset(1), slot: { from: '09:00', to: '10:30' },
    items: [{ type: 'ADULT', quantity: 2 }, { type: 'CHILD', quantity: 1 }], ...over,
});

test('TC-11: đặt 2 ADULT + 1 CHILD -> tổng 100.000, 3 mã vé, QR trỏ về máy chủ', async (t) => {
    const { slot } = mockRepos(t);
    const res = await ticketService.createOrder(order(), BASE);
    assert.strictEqual(res.totalPrice, 100000);
    assert.strictEqual(res.tickets.length, 3);
    const tag = order().date.replace(/-/g, '');
    res.tickets.forEach((tk) => {
        assert.match(tk.code, new RegExp(`^TKT-${tag}-[A-Z0-9]{6}$`));
        assert.ok(decodeURIComponent(tk.qrUrl).includes(`${BASE}/tickets.html?code=${tk.code}`));
    });
    assert.strictEqual(new Set(res.tickets.map((x) => x.code)).size, 3);
    assert.strictEqual(slot.booked, 3);
});

test('giá lấy từ máy chủ, bỏ qua giá client gửi lên', async (t) => {
    mockRepos(t);
    const res = await ticketService.createOrder(order({ items: [{ type: 'ADULT', quantity: 1, price: 1 }] }), BASE);
    assert.strictEqual(res.totalPrice, 40000);
});

test('TC-12: 11 vé -> 400', async (t) => {
    mockRepos(t);
    await assert.rejects(ticketService.createOrder(order({ items: [{ type: 'ADULT', quantity: 11 }] }), BASE), { status: 400 });
});

test('TC-13: ngày hôm qua -> 400 (cả đặt vé lẫn xem khung giờ)', async (t) => {
    mockRepos(t);
    await assert.rejects(ticketService.createOrder(order({ date: dayOffset(-1) }), BASE), { status: 400 });
    await assert.rejects(ticketService.getSlotsByDate(dayOffset(-1)), { status: 400 });
});

test('quá 60 ngày tới -> 400; đúng ngày thứ 60 vẫn được', async (t) => {
    mockRepos(t);
    await assert.rejects(ticketService.createOrder(order({ date: dayOffset(61) }), BASE), { status: 400 });
    const ok = await ticketService.createOrder(order({ date: dayOffset(60) }), BASE);
    assert.strictEqual(ok.tickets.length, 3);
});

test('ngày không có thật / sai định dạng -> 400', async (t) => {
    mockRepos(t);
    await assert.rejects(ticketService.createOrder(order({ date: '2026-02-30' }), BASE), { status: 400 });
    await assert.rejects(ticketService.createOrder(order({ date: '01/12/2026' }), BASE), { status: 400 });
});

test('loại vé không tồn tại -> 400, không giữ chỗ', async (t) => {
    const { slot } = mockRepos(t);
    await assert.rejects(ticketService.createOrder(order({ items: [{ type: 'VIP', quantity: 1 }] }), BASE), { status: 400 });
    assert.strictEqual(slot.booked, 0);
});

test('số lượng âm / không nguyên -> 400', async (t) => {
    mockRepos(t);
    await assert.rejects(ticketService.createOrder(order({ items: [{ type: 'ADULT', quantity: -2 }] }), BASE), { status: 400 });
    await assert.rejects(ticketService.createOrder(order({ items: [{ type: 'ADULT', quantity: 1.5 }] }), BASE), { status: 400 });
});

test('khung giờ không thuộc danh sách mặc định -> 400', async (t) => {
    mockRepos(t);
    await assert.rejects(ticketService.createOrder(order({ slot: { from: '20:00', to: '21:00' } }), BASE), { status: 400 });
});

test('TC-14: còn 2 chỗ mà đặt 3 vé -> 409, không tạo đơn', async (t) => {
    const { saved } = mockRepos(t, { capacity: 50, booked: 48 });
    await assert.rejects(ticketService.createOrder(order(), BASE), { status: 409 });
    assert.strictEqual(saved.length, 0);
});

test('NFR-10: nhiều người đặt cùng lúc không vượt sức chứa', async (t) => {
    const { slot } = mockRepos(t, { capacity: 10, booked: 0 });
    const results = await Promise.allSettled(Array.from({ length: 6 }, () =>
        ticketService.createOrder(order({ items: [{ type: 'ADULT', quantity: 3 }] }), BASE)));
    assert.strictEqual(results.filter((r) => r.status === 'fulfilled').length, 3);
    assert.ok(slot.booked <= slot.capacity);
});

test('lưu đơn lỗi thì trả lại chỗ đã giữ', async (t) => {
    const { slot } = mockRepos(t, { failCreate: true });
    await assert.rejects(ticketService.createOrder(order(), BASE));
    assert.strictEqual(slot.booked, 0);
});

test('TC-20: tra cứu vé chữ thường; mã sai -> 404', async (t) => {
    t.mock.method(orderRepo, 'findByTicketCode', async (code) => (code === 'TKT-20261102-ABC123'
        ? { date: '2026-11-02', slot: { from: '09:00', to: '10:30' }, tickets: [{ code, type: 'ADULT', status: 'valid' }] } : null));
    const tk = await ticketService.getTicketByCode('tkt-20261102-abc123', BASE);
    assert.strictEqual(tk.status, 'valid');
    await assert.rejects(ticketService.getTicketByCode('TKT-0-XXXXXX', BASE), { status: 404 });
});
