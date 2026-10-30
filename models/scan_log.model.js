const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema({
    artifactId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Artifact', 
        required: true 
    },
    deviceType: { type: String }, // 'Mobile', 'Tablet', 'Desktop'
    os: { type: String }, // 'iOS', 'Android'
    languageSelected: { type: String } // Mã ngôn ngữ khách đã chọn nghe
}, { timestamps: true }); 
// timestamps: true sẽ tự động tạo trường createdAt lưu thời gian quét chính xác

module.exports = mongoose.model('ScanLog', scanLogSchema);