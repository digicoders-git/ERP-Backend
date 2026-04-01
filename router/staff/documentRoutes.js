const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/staff/documentController');
const auth = require('../../middleware/auth');
const uploadDocument = require('../../middleware/uploadDocument');

router.get('/all', auth, ctrl.getAll);
router.post('/upload', auth, uploadDocument.single('file'), ctrl.upload);
router.put('/status/:id', auth, ctrl.updateStatus);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
