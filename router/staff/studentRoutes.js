const express = require('express');
const router = express.Router();
const studentController = require('../../controller/staff/studentController');
const auth = require('../../middleware/auth');
const upload = require('../../middleware/uploadStudent');

const uploadFields = upload.fields([
  { name: 'marksheet', maxCount: 1 },
  { name: 'characterCertificate', maxCount: 1 },
  { name: 'transferCertificate', maxCount: 1 },
  { name: 'birthCertificate', maxCount: 1 },
  { name: 'aadharCard', maxCount: 1 }
]);

router.get('/profile/:id', auth, studentController.getStudentProfile);
router.get('/applications', auth, studentController.getAllApplications);
router.get('/verification-list', auth, studentController.getVerificationList);
router.put('/verify/:id', auth, studentController.verifyStudent);
router.get('/enrollment-list', auth, studentController.getEnrollmentList);
router.put('/enroll/:id', auth, studentController.enrollStudent);
router.put('/documents/:id', auth, uploadFields, studentController.uploadDocuments);
router.get('/documents', auth, studentController.getAllDocuments);

module.exports = router;
