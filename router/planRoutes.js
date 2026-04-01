const express = require('express');
const router = express.Router();
const planController = require('../controller/planController');
const checkSuperAdmin = require('../middleware/checkSuperAdmin');

// All routes are protected and only accessible by Super Admin
router.post('/create', checkSuperAdmin, planController.createPlan);
router.get('/all', checkSuperAdmin, planController.getAllPlans);
router.get('/:planId', checkSuperAdmin, planController.getPlanById);
router.put('/update/:planId', checkSuperAdmin, planController.updatePlan);
router.delete('/delete/:planId', checkSuperAdmin, planController.deletePlan);

module.exports = router;
