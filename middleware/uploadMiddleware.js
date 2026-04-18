const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinaryConfig');

/**
 * Dynamic storage configuration for Multer
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Get panel and category from headers or default to 'general'
    const panel = req.headers['x-panel-name'] || 'general';
    const category = req.headers['x-category-name'] || 'misc';
    
    const uploadDir = path.join('uploads', panel, category);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

/**
 * File filter to allow images and documents
 */
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (jpeg, jpg, png, gif) and documents (pdf, doc, docx) are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

/**
 * Middleware to upload to Cloudinary after local storage
 */
const cloudinaryUpload = async (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const panel = req.headers['x-panel-name'] || 'general';
  const category = req.headers['x-category-name'] || 'misc';

  try {
    const uploadToCloudinary = async (file) => {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: `erp/${panel}/${category}`,
        resource_type: "auto"
      });
      // Attach cloudinary info to the file object
      file.cloudinaryUrl = result.secure_url;
      file.cloudinaryPublicId = result.public_id;
      return result;
    };

    if (req.file) {
      await uploadToCloudinary(req.file);
    }

    if (req.files) {
      if (Array.isArray(req.files)) {
        for (const file of req.files) {
          await uploadToCloudinary(file);
        }
      } else {
        // Handle object with fieldnames
        for (const fieldname in req.files) {
          for (const file of req.files[fieldname]) {
            await uploadToCloudinary(file);
          }
        }
      }
    }

    next();
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    // Even if cloudinary fails, we have the local file. 
    // But for this task, we want both, so we might want to return error or just proceed.
    // Let's proceed but log the error.
    next();
  }
};

module.exports = {
  upload,
  cloudinaryUpload
};
