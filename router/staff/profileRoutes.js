const express = require('express');
const router = express.Router();
const profileController = require('../../controller/staff/profileController');
const auth = require('../../middleware/auth');
const upload = require('../../middleware/upload');

router.get('/', auth, profileController.getProfile);
router.put('/update', auth, upload.single('profileImage'), profileController.updateProfile);
router.post('/change-password', auth, profileController.changePassword);

module.exports = router;
