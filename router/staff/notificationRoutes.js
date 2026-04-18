const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/staff/notificationController');
const staffAuth = require('../../middleware/staffAuth');

router.get('/all', staffAuth, ctrl.getAll);
router.post('/send', staffAuth, ctrl.send);
router.delete('/:id', staffAuth, ctrl.remove);
router.get('/settings', staffAuth, ctrl.getSettings);
router.put('/settings', staffAuth, ctrl.saveSettings);
router.get('/recipients', staffAuth, ctrl.getRecipients);

module.exports = router;
