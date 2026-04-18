const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/library/digitalLibraryController');
const auth = require('../../middleware/auth');
const { uploadDigitalBook, setDigitalBookHeaders, cloudinaryUpload } = require('../../middleware/uploadDigitalBook');

router.get('/all', auth, ctrl.getAll);
router.post('/upload', auth, setDigitalBookHeaders, uploadDigitalBook.single('file'), cloudinaryUpload, ctrl.upload);
router.put('/download/:id', auth, ctrl.incrementDownload);
router.put('/:id', auth, setDigitalBookHeaders, uploadDigitalBook.single('file'), cloudinaryUpload, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
