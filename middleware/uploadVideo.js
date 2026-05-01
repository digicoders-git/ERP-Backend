const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinaryUpload } = require('./uploadMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join('uploads', 'teacher', 'videos');
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
  const allowedTypes = /mp4|mov|avi|wmv|mkv|webm|jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('video/');

  if (extname || mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only video files (mp4, mov, avi, etc.) and images for thumbnails are allowed'));
  }
};

const uploadVideo = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for videos
  fileFilter: fileFilter
});

const setVideoHeaders = (req, res, next) => {
  req.headers['x-panel-name'] = 'teacher';
  req.headers['x-category-name'] = 'videos';
  next();
};

module.exports = {
  uploadVideo,
  setVideoHeaders,
  cloudinaryUpload
};
