const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/library/libraryProfileController');
const auth = require('../../middleware/auth');

router.get('/', auth, ctrl.getProfile);
router.put('/', auth, ctrl.updateProfile);
router.put('/change-password', auth, ctrl.changePassword);

module.exports = router;
