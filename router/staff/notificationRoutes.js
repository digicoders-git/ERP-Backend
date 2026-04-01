const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/staff/notificationController');
const auth = require('../../middleware/auth');

router.get('/all', auth, ctrl.getAll);
router.post('/send', auth, ctrl.send);
router.delete('/:id', auth, ctrl.remove);
router.get('/settings', auth, ctrl.getSettings);
router.put('/settings', auth, ctrl.saveSettings);

module.exports = router;
