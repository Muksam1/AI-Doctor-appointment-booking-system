const express = require('express');
const router = express.Router();
const { getChatHistory, markMessagesAsRead, getUnreadCounts } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const fs = require('fs');

// Specialized upload for chat (overriding destination if needed)
const chatUpload = (req, res, next) => {
    const uploadPath = 'uploads/chat';
    if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
    }
    next();
};

router.post('/upload', protect, chatUpload, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    const url = `/uploads/prescriptions/${req.file.filename}`; // uploadMiddleware currently uses prescriptions folder
    res.json({ url });
});

router.get('/history/:otherUserId', protect, getChatHistory);
router.put('/mark-read/:senderId', protect, markMessagesAsRead);
router.get('/unread-counts', protect, getUnreadCounts);

module.exports = router;
