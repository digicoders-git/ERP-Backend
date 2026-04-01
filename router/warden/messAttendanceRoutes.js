const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/messAttendanceController');
const auth = require('../../middleware/auth');

router.get('/all', auth, ctrl.getAll);
router.post('/save', auth, ctrl.save);
router.post('/add', auth, ctrl.add);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
