const express = require('express');
const router = express.Router();
const transportAllocationController = require('../controller/transportAllocationController');
const auth = require('../middleware/auth');

router.post('/create', auth, transportAllocationController.createAllocation);
router.get('/all', auth, transportAllocationController.getAllAllocations);
router.get('/:id', auth, transportAllocationController.getAllocationById);
router.put('/update/:id', auth, transportAllocationController.updateAllocation);
router.delete('/delete/:id', auth, transportAllocationController.deleteAllocation);
router.patch('/toggle-status/:id', auth, transportAllocationController.toggleAllocationStatus);

module.exports = router;
