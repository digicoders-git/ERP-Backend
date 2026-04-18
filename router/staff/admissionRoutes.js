const express = require('express');
const router = express.Router();
const admissionController = require('../../controller/staff/admissionController');
const auth = require('../../middleware/staffAuth');
const { upload, setStudentHeaders, cloudinaryUpload } = require('../../middleware/uploadStudent');

const uploadFields = upload.fields([
  { name: 'studentPhoto', maxCount: 1 },
  { name: 'medicalCertificate', maxCount: 1 },
  { name: 'fileCasteCertificate', maxCount: 1 },
  { name: 'fileMarksheet', maxCount: 1 },
  { name: 'fileCharacterCert', maxCount: 1 },
  { name: 'fileTC', maxCount: 1 },
  { name: 'fileMigrationCert', maxCount: 1 },
  { name: 'aadharCard', maxCount: 1 },
  { name: 'birthCertificate', maxCount: 1 }
]);

router.post('/add', auth, setStudentHeaders, uploadFields, cloudinaryUpload, admissionController.addAdmission);
router.get('/all', auth, admissionController.getAllAdmissions);
router.get('/:id', auth, admissionController.getAdmissionById);
router.put('/:id', auth, admissionController.updateAdmission);
router.delete('/:id', auth, admissionController.deleteAdmission);

module.exports = router;
