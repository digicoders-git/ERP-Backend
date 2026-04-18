const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinaryUpload } = require('./uploadMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join('uploads', 'teacher', 'resources');
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
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|ppt|pptx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('application/vnd.');

  if (extname || mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images, PDF, DOC, and PPT files are allowed'));
  }
};

const uploadResource = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB for resources
  fileFilter: fileFilter
});

const setResourceHeaders = (req, res, next) => {
  req.headers['x-panel-name'] = 'teacher';
  req.headers['x-category-name'] = 'resources';
  next();
};

module.exports = {
  uploadResource,
  setResourceHeaders,
  cloudinaryUpload
};
