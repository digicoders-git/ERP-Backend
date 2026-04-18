const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/teacher/profileController');
const auth = require('../../middleware/auth');

router.get('/profile', auth, ctrl.getProfile);
router.put('/profile', auth, ctrl.updateProfile);
router.post('/change-password', auth, ctrl.changePassword);

module.exports = router;
