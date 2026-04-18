const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinaryUpload } = require('./uploadMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join('uploads', 'alumni', 'profile');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'alumni-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const uploadAlumni = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

const setAlumniHeaders = (req, res, next) => {
  req.headers['x-panel-name'] = 'staff';
  req.headers['x-category-name'] = 'alumni';
  next();
};

module.exports = {
  uploadAlumni,
  setAlumniHeaders,
  cloudinaryUpload
};
