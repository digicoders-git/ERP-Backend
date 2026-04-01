const express = require('express');
const router = express.Router();
const admissionController = require('../controller/admissionController');
const auth = require('../middleware/auth');

router.get('/all', auth, admissionController.getAllAdmissions);
router.get('/:id', auth, admissionController.getAdmissionById);
router.patch('/:id/status', auth, admissionController.updateAdmissionStatus);

module.exports = router;
