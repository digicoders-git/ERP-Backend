const express = require('express');
const router = express.Router();
const studentController = require('../../controller/staff/studentController');
const flexibleAuth = require('../../middleware/flexibleAuth');
const { upload, setStudentHeaders, cloudinaryUpload } = require('../../middleware/uploadStudent');

const uploadFields = upload.fields([
  { name: 'marksheet', maxCount: 1 },
  { name: 'characterCertificate', maxCount: 1 },
  { name: 'transferCertificate', maxCount: 1 },
  { name: 'birthCertificate', maxCount: 1 },
  { name: 'aadharCard', maxCount: 1 }
]);

router.get('/profile/:id', flexibleAuth, studentController.getStudentProfile);
router.get('/applications', flexibleAuth, studentController.getAllApplications);
router.get('/verification-list', flexibleAuth, studentController.getVerificationList);
router.put('/verify/:id', flexibleAuth, studentController.verifyStudent);
router.get('/enrollment-list', flexibleAuth, studentController.getEnrollmentList);
router.put('/enroll/:id', flexibleAuth, studentController.enrollStudent);
router.put('/documents/status/:id', flexibleAuth, studentController.updateDocumentStatus);
router.put('/documents/:id', flexibleAuth, setStudentHeaders, uploadFields, cloudinaryUpload, studentController.uploadDocuments);
router.get('/documents', flexibleAuth, studentController.getAllDocuments);

module.exports = router;
