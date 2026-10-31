const TimeSlot = require('../models/time_slot.model');

const timeSlotRepository = {
    /** Lấy các slot của một ngày, trả kèm virtual 'available' */
    findByDate: (date) =>
        TimeSlot.find({ date }).sort({ from: 1 }),

    /** Tìm một slot cụ thể theo ngày + giờ bắt đầu */
    findOne: (date, from) => TimeSlot.findOne({ date, from }),

    /** Tăng số lượng đã đặt (booked) — dùng $inc để atomic */
    incrementBooked: (date, from, qty) =>
        TimeSlot.findOneAndUpdate(
            { date, from },
            { $inc: { booked: qty } },
            { new: true }
        ),

    /** Tạo nhiều slot cùng lúc (dùng khi seed / generate) */
    insertMany: (docs) => TimeSlot.insertMany(docs, { ordered: false }),

    /** Kiểm tra slot của ngày đã được generate chưa */
    countByDate: (date) => TimeSlot.countDocuments({ date }),
};

module.exports = timeSlotRepository;
