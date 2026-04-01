const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/hostelFeeController');
const auth = require('../../middleware/auth');

router.get('/all', auth, ctrl.getAll);
router.get('/stats', auth, ctrl.getStats);
router.post('/create', auth, ctrl.create);
router.patch('/collect/:id', auth, ctrl.collectPayment);
router.patch('/mark-paid/:id', auth, ctrl.markAsPaid);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
