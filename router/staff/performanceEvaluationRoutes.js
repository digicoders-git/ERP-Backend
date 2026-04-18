const express = require('express');
const router = express.Router();
const performanceEvaluationController = require('../../controller/staff/performanceEvaluationController');
const auth = require('../../middleware/staffAuth');

router.get('/', performanceEvaluationController.getAllEvaluations);
router.get('/my-evaluations', auth, performanceEvaluationController.getMyEvaluations);
router.get('/report', performanceEvaluationController.getPerformanceReport);
router.get('/:id', performanceEvaluationController.getEvaluationById);
router.get('/teacher/:teacherName', performanceEvaluationController.getEvaluationsByTeacher);
router.get('/period/:period', performanceEvaluationController.getEvaluationsByPeriod);
router.post('/', performanceEvaluationController.createEvaluation);
router.put('/:id', performanceEvaluationController.updateEvaluation);
router.delete('/:id', performanceEvaluationController.deleteEvaluation);

module.exports = router;
