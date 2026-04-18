const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/entryExitController');
const auth = require('../../middleware/wardenAuth');

router.get('/all', auth, ctrl.getAll);
router.get('/stats', auth, ctrl.getTodayStats);
router.get('/student-statuses', auth, ctrl.getStudentStatuses);
router.post('/create', auth, ctrl.add);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
