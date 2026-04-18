const express = require('express');
const router = express.Router();
const profileController = require('../../controller/staff/profileController');
const auth = require('../../middleware/staffAuth');
const { upload, setStaffHeaders, cloudinaryUpload } = require('../../middleware/upload');

router.get('/', auth, profileController.getProfile);
router.put('/update', auth, setStaffHeaders, upload.single('profileImage'), cloudinaryUpload, profileController.updateProfile);
router.post('/change-password', auth, profileController.changePassword);

module.exports = router;
