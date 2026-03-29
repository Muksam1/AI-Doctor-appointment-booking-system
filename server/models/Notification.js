const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['appointment', 'payment', 'system', 'reminder', 'promotion'],
        default: 'system'
    },
    read: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    data: {
        type: Object
    },
    relatedAppointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    },
    actionUrl: {
        type: String // URL to redirect user when clicked
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
}, {
    timestamps: true
});

// Index for efficient queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Expiration handled by TTL index in MongoDB
notificationSchema.pre('save', function(next) {
    next();
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;