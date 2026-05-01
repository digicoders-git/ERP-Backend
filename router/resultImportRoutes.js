const express = require('express');
const router = express.Router();
const resultController = require('../controller/resultImportController');
const verifyAdmin = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Admin result import routes
router.get('/template', verifyAdmin, resultController.generateExcelTemplate);
router.post('/preview', verifyAdmin, upload.single('file'), resultController.importExcelPreview);
router.post('/finalize', verifyAdmin, resultController.finalizeBulkResult);
router.post('/publish', verifyAdmin, resultController.publishResults);

module.exports = router;
