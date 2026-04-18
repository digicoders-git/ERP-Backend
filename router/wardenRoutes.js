const express = require('express');
const router = express.Router();
const wardenController = require('../controller/wardenController');
const auth = require('../middleware/auth');
const { uploadWarden, setWardenHeaders, cloudinaryUpload } = require('../middleware/uploadWarden');

router.post('/create', auth, setWardenHeaders, uploadWarden.single('profileImage'), cloudinaryUpload, wardenController.createWarden);
router.get('/all', auth, wardenController.getAllWardens);
router.get('/:id', auth, wardenController.getWardenById);
router.put('/update/:id', auth, setWardenHeaders, uploadWarden.single('profileImage'), cloudinaryUpload, wardenController.updateWarden);
router.delete('/delete/:id', auth, wardenController.deleteWarden);
router.patch('/toggle-status/:id', auth, wardenController.toggleWardenStatus);

module.exports = router;
