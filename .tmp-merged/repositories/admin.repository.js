const Admin = require('../models/admin.model');

function findByUsername(username) {
    return Admin.findOne({ username });
}

function create(data) {
    return Admin.create(data);
}

module.exports = { findByUsername, create };
