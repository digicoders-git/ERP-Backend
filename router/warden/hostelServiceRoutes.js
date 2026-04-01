const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/hostelServiceController');
const auth = require('../../middleware/auth');

router.get('/all', auth, ctrl.getAll);
router.get('/stats', auth, ctrl.getStats);
router.post('/create', auth, ctrl.create);
router.patch('/status/:id', auth, ctrl.updateStatus);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
