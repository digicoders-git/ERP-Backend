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
  const allowedImageTypes = /jpeg|jpg|png|webp/;
  const allowedDocTypes = /pdf/;
  
  const isImage = allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) && allowedImageTypes.test(file.mimetype);
  const isPDF = allowedDocTypes.test(path.extname(file.originalname).toLowerCase()) && allowedDocTypes.test(file.mimetype);

  if (file.fieldname === 'studentPhoto') {
    if (isImage) {
      cb(null, true);
    } else {
      const error = new Error('Only image files (JPEG/JPG/PNG/WEBP) are allowed for student photo');
      error.statusCode = 400;
      cb(error);
    }
  } else {
    if (isPDF || isImage) {
      cb(null, true);
    } else {
      const error = new Error('Only PDF or Image files (JPG/PNG/WEBP) are allowed for documents');
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
