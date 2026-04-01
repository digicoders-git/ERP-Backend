const express = require('express');
const router = express.Router();
const ctrl = require('../../controller/library/libraryReportsController');
const auth = require('../../middleware/auth');

router.get('/executive', auth, ctrl.getExecutiveReport);
router.get('/circulation', auth, ctrl.getCirculationReport);
router.get('/financial', auth, ctrl.getFinancialReport);
router.get('/inventory', auth, ctrl.getInventoryReport);

module.exports = router;
