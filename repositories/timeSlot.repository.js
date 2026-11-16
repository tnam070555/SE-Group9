const TimeSlot = require('../models/time_slot.model');

const timeSlotRepository = {
    /** Lấy các slot của một ngày, trả kèm virtual 'available' */
    findByDate: (date) =>
        TimeSlot.find({ date }).sort({ from: 1 }),

    /** Tìm một slot cụ thể theo ngày + giờ bắt đầu */
    findOne: (date, from) => TimeSlot.findOne({ date, from }),

    /**
     * Giữ chỗ: chỉ tăng booked khi còn đủ chỗ (kiểm tra và tăng trong CÙNG một lệnh,
     * nên hai người đặt cùng lúc không thể làm vượt sức chứa).
     * Trả về slot sau khi tăng, hoặc null nếu không đủ chỗ.
     */
    reserve: (date, from, qty) =>
        TimeSlot.findOneAndUpdate(
            { date, from, $expr: { $lte: [{ $add: ['$booked', qty] }, '$capacity'] } },
            { $inc: { booked: qty } },
            { returnDocument: 'after' }
        ),

    /** Trả lại chỗ khi đơn bị hủy / hết hạn (không để booked xuống dưới 0) */
    release: (date, from, qty) =>
        TimeSlot.updateOne(
            { date, from, booked: { $gte: qty } },
            { $inc: { booked: -qty } }
        ),

    /** Tạo nhiều slot cùng lúc (dùng khi seed / generate) */
    insertMany: (docs) => TimeSlot.insertMany(docs, { ordered: false }),

    /** Kiểm tra slot của ngày đã được generate chưa */
    countByDate: (date) => TimeSlot.countDocuments({ date }),
};

module.exports = timeSlotRepository;
