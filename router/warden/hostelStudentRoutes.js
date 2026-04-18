const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/hostelStudentController');
const auth = require('../../middleware/wardenAuth');

router.get('/all', auth, ctrl.getAll);
router.get('/stats', auth, ctrl.getStats);
router.get('/:id', auth, ctrl.getById);
router.post('/create', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.patch('/toggle-status/:id', auth, ctrl.toggleStatus);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
