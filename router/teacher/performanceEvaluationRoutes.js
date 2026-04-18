const express = require('express');
const router = express.Router();
const performanceEvaluationController = require('../../controller/staff/performanceEvaluationController');
const auth = require('../../middleware/auth');

router.get('/my-evaluations', auth, performanceEvaluationController.getMyEvaluations);

module.exports = router;
