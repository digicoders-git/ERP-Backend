const express = require('express');
const router = express.Router();
const transportAllocationController = require('../controller/transportAllocationController');
const flexibleAuth = require('../middleware/flexibleAuth');

router.post('/create', flexibleAuth, transportAllocationController.createAllocation);
router.get('/all', flexibleAuth, transportAllocationController.getAllAllocations);
router.get('/:id', flexibleAuth, transportAllocationController.getAllocationById);
router.put('/update/:id', flexibleAuth, transportAllocationController.updateAllocation);
router.delete('/delete/:id', flexibleAuth, transportAllocationController.deleteAllocation);
router.patch('/toggle-status/:id', flexibleAuth, transportAllocationController.toggleAllocationStatus);

module.exports = router;
