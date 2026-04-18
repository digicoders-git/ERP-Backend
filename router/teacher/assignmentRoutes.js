const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const assignmentController = require('../../controller/teacher/assignmentController');
const auth = require('../../middleware/auth');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/assignments/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.post('/create', auth, upload.fields([{ name: 'document', maxCount: 1 }, { name: 'image', maxCount: 1 }]), assignmentController.createAssignment);
router.get('/all', auth, assignmentController.getAllAssignments);
router.get('/:id', auth, assignmentController.getAssignmentById);
router.put('/:id', auth, upload.fields([{ name: 'document', maxCount: 1 }, { name: 'image', maxCount: 1 }]), assignmentController.updateAssignment);
router.delete('/:id', auth, assignmentController.deleteAssignment);

module.exports = router;
