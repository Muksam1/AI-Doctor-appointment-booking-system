const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Configure Multer storage for medical prescriptions and profile images
 */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'uploads/prescriptions';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Unique filename format: [appointmentId]-[timestamp][extension]
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

/**
 * File Filter to allow only PDFs and common image types
 */
const fileFilter = (req, file, cb) => {
    const allowedFileTypes = /jpeg|jpg|png|pdf|mp4|webm|avi|mkv|mov|gif/;
    const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedFileTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only images and videos are allowed.'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for videos and images
    fileFilter: fileFilter
});

module.exports = upload;
