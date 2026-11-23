const View = require('../models/view.model');

function create(event) {
    return View.create(event);
}

// Đếm theo (field, loại). field chỉ nhận 'code' hoặc 'language' do code nội bộ truyền vào
function countGroupedBy(field) {
    return View.aggregate([{ $group: { _id: { key: `$${field}`, type: '$type' }, count: { $sum: 1 } } }]);
}

function countViewsSince(date) {
    return View.countDocuments({ type: 'view', createdAt: { $gte: date } });
}

// Đếm số bản ghi của một loại trong khoảng [from, to)
function countBetween(type, from, to) {
    const createdAt = { $gte: from };
    if (to) createdAt.$lt = to;
    return View.countDocuments({ type, createdAt });
}

// Đếm theo từng ngày (theo múi giờ timezone) và loại, từ ngày from trở đi
// Kết quả: [{ _id: { day: '2026-11-12', type: 'view' }, count: 5 }, ...]
function countDailySince(from, timezone) {
    return View.aggregate([
        { $match: { createdAt: { $gte: from } } },
        {
            $group: {
                _id: {
                    day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone } },
                    type: '$type',
                },
                count: { $sum: 1 },
            },
        },
    ]);
}

module.exports = { create, countGroupedBy, countViewsSince, countBetween, countDailySince };
