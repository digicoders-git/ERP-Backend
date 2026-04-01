const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/library/digitalLibraryController');
const auth = require('../../middleware/auth');
const uploadDigitalBook = require('../../middleware/uploadDigitalBook');

router.get('/all', auth, ctrl.getAll);
router.post('/upload', auth, uploadDigitalBook.single('file'), ctrl.upload);
router.put('/download/:id', auth, ctrl.incrementDownload);
router.put('/:id', auth, uploadDigitalBook.single('file'), ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
