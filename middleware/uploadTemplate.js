const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join('uploads', 'admin', 'templates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'template-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow PDF, images, HTML, and Word files
  const allowedMimes = [
    'application/pdf', 
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
    'text/html',
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const allowedExtensions = /pdf|jpeg|jpg|png|gif|html|doc|docx/;
  
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimes.includes(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, image files (jpeg, jpg, png, gif), HTML, and Word files (doc, docx) are allowed'));
  }
};

const uploadTemplate = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for templates
  fileFilter: fileFilter
});

module.exports = uploadTemplate;
