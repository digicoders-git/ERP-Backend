const express = require('express');
const router = express.Router();
const hostelAllocationController = require('../controller/hostelAllocationController');
const auth = require('../middleware/auth');

router.post('/allocate', auth, hostelAllocationController.allocateHostel);
router.get('/all', auth, hostelAllocationController.getAllAllocations);
router.get('/:id', auth, hostelAllocationController.getAllocationById);
router.put('/update/:id', auth, hostelAllocationController.updateAllocation);
router.patch('/cancel/:id', auth, hostelAllocationController.cancelAllocation);

module.exports = router;
