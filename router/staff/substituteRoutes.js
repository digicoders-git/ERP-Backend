const express = require('express');
const router = express.Router();
const substituteController = require('../../controller/staff/substituteController');
const auth = require('../../middleware/auth');

router.post('/assign', auth, substituteController.assignSubstitute);
router.get('/history', auth, substituteController.getSubstituteHistory);
router.delete('/:id', auth, substituteController.deleteSubstitute);

module.exports = router;
