const Category = require('../models/category.model');

// Lớp 3: chỉ truy vấn database, không chứa logic nghiệp vụ
function findAll() {
    return Category.find().lean();
}

function findById(id) {
    return Category.findById(id);
}

function existsBySlug(slug) {
    return Category.exists({ slug });
}

function count() {
    return Category.countDocuments();
}

function create(data) {
    return Category.create(data);
}

function insertMany(items) {
    return Category.insertMany(items);
}

function updateById(id, data) {
    return Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}

function deleteById(id) {
    return Category.findByIdAndDelete(id);
}

// ----- Dùng khi khởi động để bổ sung slug cho khu vực cũ (đi thẳng collection vì dữ liệu cũ chưa hợp schema) -----
function findWithoutSlug() {
    return Category.collection.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] }).toArray();
}

function findOtherBySlug(slug, exceptId) {
    return Category.collection.findOne({ slug, _id: { $ne: exceptId } });
}

function setSlug(id, slug) {
    return Category.collection.updateOne({ _id: id }, { $set: { slug } });
}

function syncIndexes() {
    return Category.syncIndexes();
}

module.exports = {
    findAll, findById, existsBySlug, count, create, insertMany, updateById, deleteById,
    findWithoutSlug, findOtherBySlug, setSlug, syncIndexes,
};
