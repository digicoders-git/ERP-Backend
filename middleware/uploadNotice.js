const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinaryUpload } = require('./uploadMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join('uploads', 'admin', 'notices');
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
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype === 'application/pdf' || 
                   file.mimetype === 'application/msword' || 
                   file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   file.mimetype.startsWith('image/');
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images, PDF, and DOC files are allowed'));
  }
};

const uploadNotice = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter
});

const setNoticeHeaders = (req, res, next) => {
  req.headers['x-panel-name'] = 'admin';
  req.headers['x-category-name'] = 'notices';
  next();
};

module.exports = {
  uploadNotice,
  setNoticeHeaders,
  cloudinaryUpload
};
