const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/library/libraryCardController');
const auth = require('../../middleware/auth');

router.get('/all', auth, ctrl.getAll);
router.post('/add', auth, ctrl.create);
router.put('/renew/:id', auth, ctrl.renew);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
