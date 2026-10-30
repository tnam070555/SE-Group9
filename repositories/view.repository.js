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

module.exports = { create, countGroupedBy, countViewsSince };
