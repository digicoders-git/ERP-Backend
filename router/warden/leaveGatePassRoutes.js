const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/leaveGatePassController');
const auth = require('../../middleware/wardenAuth');

router.get('/all', auth, ctrl.getAll);
router.get('/stats', auth, ctrl.getStats);
router.post('/create', auth, ctrl.create);
router.put('/approve/:id', auth, ctrl.approve);
router.put('/reject/:id', auth, ctrl.reject);
router.patch('/:id/status', auth, ctrl.updateStatus);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
