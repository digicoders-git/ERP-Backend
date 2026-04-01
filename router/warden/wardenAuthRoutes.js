const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/wardenAuthController');
const auth = require('../../middleware/auth');

router.post('/login', ctrl.login);
router.get('/profile', auth, ctrl.getProfile);
router.post('/change-password', auth, ctrl.changePassword);
router.post('/logout', auth, ctrl.logout);

module.exports = router;
