const express = require('express');
const router = express.Router();
const resultController = require('../../controller/resultImportController');
const verifyStaff = require('../../middleware/staffAuth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Debugging
if (!resultController || !resultController.generateExcelTemplate) {
    console.error('CRITICAL: resultImportController failed to export functions properly!');
}

// Staff result import routes
router.get('/template', verifyStaff, (req, res, next) => {
    if (resultController.generateExcelTemplate) return resultController.generateExcelTemplate(req, res, next);
    res.status(500).json({ message: 'Controller not loaded' });
});

router.post('/preview', verifyStaff, upload.single('file'), (req, res, next) => {
    if (resultController.importExcelPreview) return resultController.importExcelPreview(req, res, next);
    res.status(500).json({ message: 'Controller not loaded' });
});

router.post('/finalize', verifyStaff, (req, res, next) => {
    if (resultController.finalizeBulkResult) return resultController.finalizeBulkResult(req, res, next);
    res.status(500).json({ message: 'Controller not loaded' });
});

router.post('/publish', verifyStaff, (req, res, next) => {
    if (resultController.publishResults) return resultController.publishResults(req, res, next);
    res.status(500).json({ message: 'Controller not loaded' });
});

router.get('/export', verifyStaff, (req, res, next) => {
    if (resultController.exportClassResults) return resultController.exportClassResults(req, res, next);
    res.status(500).json({ message: 'Controller not loaded' });
});

module.exports = router;
