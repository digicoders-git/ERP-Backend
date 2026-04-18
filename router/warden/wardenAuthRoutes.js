const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/wardenAuthController');
const auth = require('../../middleware/wardenAuth');

const { uploadWarden, setWardenHeaders } = require('../../middleware/uploadWarden');

router.post('/login', ctrl.login);
router.get('/profile', auth, ctrl.getProfile);
router.put('/profile', auth, setWardenHeaders, uploadWarden.single('profileImage'), ctrl.updateProfile);
router.post('/change-password', auth, ctrl.changePassword);
router.post('/logout', auth, ctrl.logout);

module.exports = router;
