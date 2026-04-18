const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/bedAllocationController');
const auth = require('../../middleware/wardenAuth');

router.get('/all', auth, ctrl.getAll);
router.get('/stats', auth, ctrl.getStats);
router.get('/student/:studentId', auth, ctrl.getByStudent);
router.post('/allocate', auth, ctrl.allocate);
router.patch('/deallocate/:id', auth, ctrl.deallocate);

module.exports = router;
