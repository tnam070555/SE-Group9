const artifactService = require('../services/artifact.service');
const { parseLanguage } = require('../config/languages');

// Lớp 1: chỉ lo HTTP. Express 5 tự chuyển lỗi bất đồng bộ sang errorHandler.
class ArtifactController {
    async createArtifact(req, res) {
        const result = await artifactService.create(req.body);
        res.status(201).json({ success: true, data: result });
    }

    // ?lang=en|ja|ko|zh (mặc định vi). Chưa có bản dịch thì trả tiếng Việt kèm fallback: true
    async getArtifacts(req, res) {
        const results = await artifactService.getAll(parseLanguage(req.query.lang));
        res.status(200).json({ success: true, data: results });
    }

    async getArtifactById(req, res) {
        const result = await artifactService.getById(req.params.id);
        res.status(200).json({ success: true, data: result });
    }

    async getArtifactByCode(req, res) {
        const result = await artifactService.getLocalizedByCode(req.params.code, parseLanguage(req.query.lang));
        res.status(200).json({ success: true, data: result });
    }

    // Ảnh QR trỏ tới detail.html. Địa chỉ gốc lấy theo thứ tự: ?base= -> PUBLIC_BASE_URL -> địa chỉ đang truy cập
    async getQrCode(req, res) {
        const base = (typeof req.query.base === 'string' && req.query.base)
            || process.env.PUBLIC_BASE_URL
            || `${req.protocol}://${req.get('host')}`;
        const png = await artifactService.getQrPng(req.params.code, base);
        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'no-store');
        res.send(png);
    }

    async updateArtifact(req, res) {
        const result = await artifactService.update(req.params.id, req.body);
        res.status(200).json({ success: true, data: result });
    }

    async setTranslation(req, res) {
        const result = await artifactService.setTranslation(req.params.id, req.params.lang, req.body);
        res.status(200).json({ success: true, data: result });
    }

    async translateArtifact(req, res) {
        const { artifact, report } = await artifactService.translate(req.params.id, req.body || {});
        res.status(200).json({ success: true, data: artifact, report });
    }

    async deleteArtifact(req, res) {
        await artifactService.delete(req.params.id);
        res.status(200).json({ success: true, message: 'Xóa công trình thành công' });
    }
}

module.exports = new ArtifactController();
