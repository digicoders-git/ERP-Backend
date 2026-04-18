const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/warden/visitorController');
const auth = require('../../middleware/wardenAuth');

router.get('/all', auth, ctrl.getAll);
router.get('/stats', auth, ctrl.getStats);
router.post('/create', auth, ctrl.create);
router.put('/checkout/:id', auth, ctrl.checkOut);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
