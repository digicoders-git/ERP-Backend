const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/staff/documentController');
const auth = require('../../middleware/staffAuth');
const { upload, setStaffHeaders, cloudinaryUpload } = require('../../middleware/upload');

router.get('/all', auth, ctrl.getAll);
router.post('/upload', auth, setStaffHeaders, upload.single('file'), cloudinaryUpload, ctrl.upload);
router.put('/status/:id', auth, ctrl.updateStatus);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
