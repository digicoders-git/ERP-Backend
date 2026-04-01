const express = require('express');
const router = express.Router();
const wardenController = require('../controller/wardenController');
const auth = require('../middleware/auth');
const upload = require('../middleware/uploadWarden');

router.post('/create', auth, upload.single('profileImage'), wardenController.createWarden);
router.get('/all', auth, wardenController.getAllWardens);
router.get('/:id', auth, wardenController.getWardenById);
router.put('/update/:id', auth, upload.single('profileImage'), wardenController.updateWarden);
router.delete('/delete/:id', auth, wardenController.deleteWarden);
router.patch('/toggle-status/:id', auth, wardenController.toggleWardenStatus);

module.exports = router;
