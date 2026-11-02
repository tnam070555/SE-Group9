const express = require('express');
const router = express.Router();
const artifactController = require('../controllers/artifact.controller');
const { verifyToken, requireAdmin } = require('../middlewares/auth.middleware');

// Công khai: du khách xem (thêm ?lang=en|ja|ko|zh để chọn ngôn ngữ)
router.get('/', artifactController.getArtifacts);
router.get('/code/:code', artifactController.getArtifactByCode);
router.get('/code/:code/qr', artifactController.getQrCode);
router.get('/:id', artifactController.getArtifactById);

// Chỉ admin đã đăng nhập
router.post('/', verifyToken, requireAdmin, artifactController.createArtifact);
router.put('/:id', verifyToken, requireAdmin, artifactController.updateArtifact);
router.put('/:id/translations/:lang', verifyToken, requireAdmin, artifactController.setTranslation);
router.post('/:id/translate', verifyToken, requireAdmin, artifactController.translateArtifact);
router.delete('/:id', verifyToken, requireAdmin, artifactController.deleteArtifact);

module.exports = router;
