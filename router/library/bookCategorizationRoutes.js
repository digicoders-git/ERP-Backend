const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/library/bookCategorizationController');
const auth = require('../../middleware/auth');

router.get('/all', auth, ctrl.getAll);
router.post('/add', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
