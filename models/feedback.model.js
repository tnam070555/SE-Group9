const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    artifactId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Artifact', // Liên kết tới ID của bảng artifacts hiện có
        required: true 
    },
    rating: { type: Number, required: true, min: 1, max: 5 }, // Số sao (1-5)
    comment: { type: String } // Lời bình luận của khách
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);