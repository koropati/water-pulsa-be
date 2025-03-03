// src/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
    ApiError
} = require('./error');
const {
    STATUS_CODES
} = require('../config/constants');

// Maximum file size (2MB by default)
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE ?
    parseInt(process.env.MAX_FILE_SIZE, 10) :
    2 * 1024 * 1024;

// Upload directory
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Create upload directory if it doesn't exist
const createUploadDir = (dir) => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, {
            recursive: true
        });
    }
    return fullPath;
};

// Profile avatar storage
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(UPLOAD_DIR, 'profiles');
        createUploadDir(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const userId = req.user.id;
        const timestamp = Date.now();
        const fileExt = path.extname(file.originalname);
        const filename = `avatar-${userId}-${timestamp}${fileExt}`;
        cb(null, filename);
    }
});

// File filter - only allow images
const imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

    if (!allowedTypes.includes(file.mimetype)) {
        const error = new ApiError(
            'Only image files (jpeg, jpg, png, gif) are allowed',
            STATUS_CODES.BAD_REQUEST
        );
        return cb(error, false);
    }

    cb(null, true);
};

// Configure multer for profile avatars
const avatarUpload = multer({
    storage: profileStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: MAX_FILE_SIZE
    }
});

// Middleware for uploading profile avatar
const uploadAvatar = (req, res, next) => {
    avatarUpload.single('avatar')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Multer error
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(
                    new ApiError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`, STATUS_CODES.BAD_REQUEST)
                );
            }
            return next(
                new ApiError(`File upload error: ${err.message}`, STATUS_CODES.BAD_REQUEST)
            );
        } else if (err) {
            // Other error
            return next(err);
        }

        // Success - continue
        next();
    });
};

// Get file URL for uploaded file
const getFileUrl = (filename, subdir = 'profiles') => {
    return `/uploads/${subdir}/${filename}`;
};

module.exports = {
    uploadAvatar,
    getFileUrl
};