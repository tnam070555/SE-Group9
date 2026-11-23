const languageService = require('../services/language.service');
const { activeLanguages, SOURCE_LANGUAGE } = require('../config/languages');

// Lớp 1: chỉ lo HTTP. Express 5 tự chuyển lỗi bất đồng bộ sang errorHandler.
class LanguageController {
    // Công khai: chỉ ngôn ngữ đang bật, tiếng Việt là ngôn ngữ gốc
    getPublic(req, res) {
        const data = activeLanguages().map(({ code, label, speech }) => ({ code, label, speech, isSource: code === SOURCE_LANGUAGE }));
        res.json({ success: true, data });
    }

    async listForAdmin(req, res) {
        res.json({ success: true, data: await languageService.listForAdmin() });
    }

    async create(req, res) {
        const data = await languageService.create(req.body);
        res.status(201).json({ success: true, data, message: 'Đã thêm ngôn ngữ' });
    }

    async update(req, res) {
        const data = await languageService.update(req.params.code, req.body);
        res.json({ success: true, data, message: 'Đã cập nhật ngôn ngữ' });
    }

    async delete(req, res) {
        await languageService.delete(req.params.code);
        res.json({ success: true, message: 'Đã xóa ngôn ngữ' });
    }
}

module.exports = new LanguageController();
