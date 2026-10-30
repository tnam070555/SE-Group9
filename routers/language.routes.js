const express = require('express');
const router = express.Router();
const { LANGUAGES, SOURCE_LANGUAGE } = require('../config/languages');

// Danh sách ngôn ngữ hỗ trợ (công khai), tiếng Việt là ngôn ngữ gốc
router.get('/', (req, res) => {
    const data = LANGUAGES.map(({ code, label, speech }) => ({ code, label, speech, isSource: code === SOURCE_LANGUAGE }));
    res.json({ success: true, data });
});

module.exports = router;
