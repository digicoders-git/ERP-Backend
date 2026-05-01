const express = require('express');
const router = express.Router();
const ctrl = require('../controller/clientSettingsController');
const auth = require('../middleware/auth');
const { uploadAdmin, setAdminHeaders, setClientSettingsHeaders, cloudinaryUpload } = require('../middleware/uploadAdmin');

// Get all settings
router.get('/', require('../middleware/flexibleAuth'), ctrl.getSettings);

// Update Branding
router.put('/branding/update', auth, setClientSettingsHeaders, uploadAdmin.single('logo'), cloudinaryUpload, ctrl.updateBranding);

// Update Staff Configuration
router.put('/staff/update', auth, ctrl.updateStaffConfig);

// Update Teacher Configuration
router.put('/teacher/update', auth, ctrl.updateTeacherConfig);

// Update Student Configuration
router.put('/student/update', auth, ctrl.updateStudentConfig);

// Update Attendance Settings
router.put('/attendance/update', auth, ctrl.updateAttendanceSettings);

// Update Admission Settings
router.put('/admission/update', auth, ctrl.updateAdmissionSettings);

// Update ID Card Design
router.put('/idCard/update', auth, ctrl.updateIDCardDesign);

// Upload ID Card Template
router.post('/idcard/upload-template', require('../middleware/flexibleAuth'), setClientSettingsHeaders, uploadAdmin.single('template'), cloudinaryUpload, ctrl.uploadIDCardTemplate);

// Update ID Card Configuration (templates + fields + design)
router.put('/idcard/config/update', require('../middleware/flexibleAuth'), ctrl.updateIDCardConfig);

// Update Fee Slip Design
router.put('/feeSlip/update', auth, ctrl.updateFeeSlipDesign);

// Upload Fee Slip Template
router.post('/feeslip/upload-template', require('../middleware/flexibleAuth'), setClientSettingsHeaders, uploadAdmin.single('template'), cloudinaryUpload, ctrl.uploadFeeSlipTemplate);

// Update Marksheet Design
router.put('/marksheet/update', auth, ctrl.updateMarksheetDesign);

// Upload Marksheet Template
router.post('/marksheet/upload-template', auth, setClientSettingsHeaders, uploadAdmin.single('template'), cloudinaryUpload, ctrl.uploadMarksheetTemplate);

// Update Marksheet Templates
router.put('/marksheet/templates/update', auth, ctrl.updateMarksheetTemplates);

// Update Transport Settings
router.put('/transport/update', auth, ctrl.updateTransportSettings);

// Exam Type Routes
router.post('/exam-types/create', auth, ctrl.createExamType);
router.get('/exam-types', auth, ctrl.getExamTypes);
router.put('/exam-types/:examTypeId', auth, ctrl.updateExamType);
router.delete('/exam-types/:examTypeId', auth, ctrl.deleteExamType);
router.post('/exam-types/:examTypeId/upload-template', auth, setClientSettingsHeaders, uploadAdmin.single('template'), cloudinaryUpload, ctrl.uploadExamTypeTemplate);

// Get specific section (must be last)
router.get('/:section', auth, ctrl.getSettingSection);

module.exports = router;
