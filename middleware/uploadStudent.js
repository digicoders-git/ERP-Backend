const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinaryUpload } = require('./uploadMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let category = 'misc';
    if (file.fieldname === 'studentPhoto') {
      category = 'profile';
    } else {
      category = 'documents';
    }
    
    const uploadDir = path.join('uploads', 'students', category);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'studentPhoto') {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      const error = new Error('Only image files (JPEG/JPG/PNG) are allowed for student photo');
      error.statusCode = 400;
      cb(error);
    }
  } else {
    if (file.mimetype === 'application/pdf' && path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      const error = new Error('Only PDF files are allowed for documents');
      error.statusCode = 400;
      cb(error);
    }
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Wrapper middleware to inject panel and category headers if not present
const setStudentHeaders = (req, res, next) => {
  req.headers['x-panel-name'] = 'students';
  if (req.file && req.file.fieldname === 'studentPhoto') {
    req.headers['x-category-name'] = 'profile';
  } else {
    req.headers['x-category-name'] = 'documents';
  }
  next();
};

module.exports = {
  upload,
  setStudentHeaders,
  cloudinaryUpload
};
