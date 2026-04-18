const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinaryUpload } = require('./uploadMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join('uploads', 'library', 'digital');
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
  const allowedTypes = /pdf|epub|mobi|doc|docx|txt|ppt|pptx|xls|xlsx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const allowedMimeTypes = [
    'application/pdf',
    'application/epub+zip',
    'application/x-mobipocket-ebook',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, EPUB, MOBI, DOC, DOCX, TXT, PPT, PPTX, XLS, XLSX files are allowed'));
  }
};

const uploadDigitalBook = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB for books
  fileFilter: fileFilter
});

const setDigitalBookHeaders = (req, res, next) => {
  req.headers['x-panel-name'] = 'library';
  req.headers['x-category-name'] = 'digital';
  next();
};

module.exports = {
  uploadDigitalBook,
  setDigitalBookHeaders,
  cloudinaryUpload
};
