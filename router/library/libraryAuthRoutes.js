const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/library/libraryAuthController');
const auth = require('../../middleware/auth');

router.post('/login', ctrl.login);
router.get('/settings', auth, ctrl.getSettings);
router.put('/settings', auth, ctrl.saveSettings);

module.exports = router;
