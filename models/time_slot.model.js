const mongoose = require('mongoose');

/**
 * TimeSlot – một khung giờ tham quan trong một ngày cụ thể.
 * Được tạo tự động cho 60 ngày tới khi server khởi động (hoặc theo yêu cầu).
 * index { date, from } unique để tránh trùng.
 */
const timeSlotSchema = new mongoose.Schema({
    date:     { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // ISO date: 2024-12-25
    from:     { type: String, required: true },   // VD: "07:30"
    to:       { type: String, required: true },   // VD: "09:00"
    capacity: { type: Number, required: true, min: 1, default: 50 },
    booked:   { type: Number, default: 0, min: 0 },
}, { timestamps: true });

timeSlotSchema.index({ date: 1, from: 1 }, { unique: true });

// Virtual: chỗ còn lại
timeSlotSchema.virtual('available').get(function () {
    return Math.max(0, this.capacity - this.booked);
});

module.exports = mongoose.model('TimeSlot', timeSlotSchema);
