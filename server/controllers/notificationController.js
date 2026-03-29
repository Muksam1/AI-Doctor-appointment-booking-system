const Notification = require('../models/Notification');
const User = require('../models/User');
const { getIO } = require('../socket');
const smsService = require('../config/smsService');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type; // appointment, payment, system, etc.

        let filter = { user: req.user._id };

        if (type) {
            filter.type = type;
        }

        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Notification.countDocuments(filter);

        // Mark notifications as read if requested
        if (req.query.markRead === 'true') {
            await Notification.updateMany(
                { user: req.user._id, read: false },
                { read: true }
            );
        }

        res.json({
            notifications,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalNotifications: total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (notification.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        notification.read = true;
        await notification.save();

        res.json({
            success: true,
            notification
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user._id, read: false },
            { read: true }
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (notification.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await notification.deleteOne();

        res.json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create notification (internal function)
const createNotification = async (userId, type, title, message, data = {}) => {
    try {
        const notification = await Notification.create({
            user: userId,
            type,
            title,
            message,
            data
        });

        // Get user details for SMS
        const user = await User.findById(userId).select('contact name');

        // Send SMS for important notifications
        if (user?.contact && ['appointment', 'payment', 'reminder'].includes(type)) {
            try {
                let smsMessage = message;

                // Customize SMS message based on type
                if (type === 'appointment' && data.appointment) {
                    smsMessage = `HealSync: ${message}`;
                } else if (type === 'payment') {
                    smsMessage = `HealSync: ${message}`;
                } else if (type === 'reminder' && data.appointment) {
                    smsMessage = `HealSync Reminder: ${message}`;
                }

                await smsService.sendSMS(user.contact, smsMessage);
            } catch (smsError) {
                console.error('SMS sending failed:', smsError);
                // Don't fail the notification creation if SMS fails
            }
        }

        // Emit socket event for real-time notification
        const io = getIO();
        if (io) {
            io.to(userId.toString()).emit('notification', notification);
        }

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

// @desc    Send bulk notifications
// @route   POST /api/notifications/bulk
// @access  Private/Admin
const sendBulkNotification = async (req, res) => {
    try {
        const { userIds, type, title, message, data } = req.body;

        const notifications = await Promise.all(
            userIds.map(userId =>
                Notification.create({
                    user: userId,
                    type: type || 'system',
                    title,
                    message,
                    data: data || {}
                })
            )
        );

        // Emit socket events
        const io = getIO();
        if (io) {
            userIds.forEach(userId => {
                const userNotifications = notifications.filter(n => n.user.toString() === userId.toString());
                io.to(userId.toString()).emit('notification', userNotifications[0]);
            });
        }

        res.json({
            success: true,
            notifications,
            message: `Notifications sent to ${userIds.length} users`
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private/Admin
const getNotificationStats = async (req, res) => {
    try {
        const stats = await Notification.aggregate([
            {
                $group: {
                    _id: { type: '$type', read: '$read' },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.type',
                    total: { $sum: '$count' },
                    read: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.read', true] }, '$count', 0]
                        }
                    },
                    unread: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.read', false] }, '$count', 0]
                        }
                    }
                }
            }
        ]);

        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Clean up expired notifications
// @route   DELETE /api/notifications/cleanup
// @access  Private/Admin
const cleanupExpiredNotifications = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const result = await Notification.deleteMany({
            createdAt: { $lt: thirtyDaysAgo }
        });

        res.json({
            success: true,
            deletedCount: result.deletedCount,
            message: 'Expired notifications cleaned up'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete all notifications for current user
// @route   DELETE /api/notifications
// @access  Private
const deleteAllNotifications = async (req, res) => {
    try {
        await Notification.deleteMany({ user: req.user._id });

        res.json({
            success: true,
            message: 'All notifications cleared successfully'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    sendBulkNotification,
    getNotificationStats,
    cleanupExpiredNotifications,
    createNotification
};