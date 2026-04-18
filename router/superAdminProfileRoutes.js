const express = require('express');
const router = express.Router();
const ctrl = require('../controller/superAdminProfileController');
const checkSuperAdmin = require('../middleware/checkSuperAdmin');

const { uploadAdmin, setAdminHeaders, cloudinaryUpload } = require('../middleware/uploadAdmin');

router.get('/profile', checkSuperAdmin, ctrl.getProfile);
router.put('/profile', checkSuperAdmin, setAdminHeaders, uploadAdmin.single('profileImage'), cloudinaryUpload, ctrl.updateProfile);
router.post('/change-password', checkSuperAdmin, ctrl.changePassword);

module.exports = router;
