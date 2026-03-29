const express = require('express');
const router = express.Router();
const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    sendBulkNotification,
    getNotificationStats,
    cleanupExpiredNotifications
} = require('../controllers/notificationController');

const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// User routes
router.get('/', getNotifications);
router.delete('/', deleteAllNotifications);
router.put('/:id/read', markAsRead);
router.put('/mark-all-read', markAllAsRead);
router.delete('/:id', deleteNotification);

// Admin routes
router.post('/bulk', authorize('admin'), sendBulkNotification);
router.get('/stats', authorize('admin'), getNotificationStats);
router.delete('/cleanup', authorize('admin'), cleanupExpiredNotifications);

module.exports = router;