const express = require('express');
const router = express.Router();
const admissionController = require('../../controller/staff/admissionController');
const auth = require('../../middleware/auth');
const upload = require('../../middleware/uploadStudent');

const uploadFields = upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'marksheet', maxCount: 1 },
  { name: 'characterCertificate', maxCount: 1 },
  { name: 'transferCertificate', maxCount: 1 }
]);

router.post('/add', auth, uploadFields, admissionController.addAdmission);
router.get('/all', auth, admissionController.getAllAdmissions);
router.get('/:id', auth, admissionController.getAdmissionById);

module.exports = router;
