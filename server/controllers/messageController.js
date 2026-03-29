const Message = require('../models/Message');

// @desc    Get chat history between two users
// @route   GET /api/messages/:otherUserId
// @access  Private
const getChatHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const otherUserId = req.params.otherUserId;

        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: otherUserId },
                { sender: otherUserId, receiver: userId }
            ]
        }).sort({ timestamp: 1 });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chat history', error: error.message });
    }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/mark-read/:senderId
// @access  Private
const markMessagesAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const senderId = req.params.senderId;

        await Message.updateMany(
            { sender: senderId, receiver: userId, isRead: false },
            { isRead: true }
        );

        res.json({ message: 'Messages marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error marking messages as read', error: error.message });
    }
};

// @desc    Get unread counts for all contacts
// @route   GET /api/messages/unread-counts
// @access  Private
const getUnreadCounts = async (req, res) => {
    try {
        const userId = req.user._id;

        const unreadCounts = await Message.aggregate([
            { $match: { receiver: userId, isRead: false } },
            { $group: { _id: '$sender', count: { $sum: 1 } } }
        ]);

        res.json(unreadCounts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching unread counts', error: error.message });
    }
};

module.exports = {
    getChatHistory,
    markMessagesAsRead,
    getUnreadCounts
};
