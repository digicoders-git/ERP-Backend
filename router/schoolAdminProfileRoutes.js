const express = require('express');
const router = express.Router();
const ctrl = require('../controller/schoolAdminProfileController');
const auth = require('../middleware/auth');

const { uploadAdmin, setAdminHeaders, cloudinaryUpload } = require('../middleware/uploadAdmin');

router.get('/profile', auth, ctrl.getProfile);
router.put('/profile', auth, setAdminHeaders, uploadAdmin.single('profileImage'), cloudinaryUpload, ctrl.updateProfile);
router.post('/change-password', auth, ctrl.changePassword);

module.exports = router;
