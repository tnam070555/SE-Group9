const express = require('express');
const router = express.Router();
const languageController = require('../controllers/language.controller');

// Danh sách ngôn ngữ đang bật (công khai). Quản lý ngôn ngữ nằm ở /api/admin/languages
router.get('/', languageController.getPublic);

module.exports = router;
