const Feedback = require('../models/feedback.model');

// Điểm trung bình và số lượt đánh giá: { average, count }
async function getRatingSummary() {
    const [row] = await Feedback.aggregate([
        { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    return { average: row ? row.average : null, count: row ? row.count : 0 };
}

module.exports = { getRatingSummary };
