const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/library/bookLimitController');
const auth = require('../../middleware/auth');

router.get('/all', auth, ctrl.getAll);
router.get('/class/:class', auth, ctrl.getLimitByClass);
router.post('/add', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
