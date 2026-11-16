const Artifact = require('../models/artifact.model');

// Lớp 3: chỉ truy vấn database, không chứa logic nghiệp vụ
function findAll() {
    return Artifact.find().sort({ code: 1 });
}

function findById(id) {
    return Artifact.findById(id);
}

function findByCode(code) {
    return Artifact.findOne({ code });
}

function count() {
    return Artifact.countDocuments();
}

function create(data) {
    return Artifact.create(data);
}

function insertMany(items) {
    return Artifact.insertMany(items);
}

function updateById(id, data) {
    return Artifact.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true });
}

function deleteById(id) {
    return Artifact.findByIdAndDelete(id);
}

// Chỉ lấy các trường cần để đồng bộ mã QR
function findAllForQr() {
    return Artifact.find({}, { code: 1, qrLink: 1 }).lean();
}

module.exports = { findAllForQr, findAll, findById, findByCode, count, create, insertMany, updateById, deleteById };
