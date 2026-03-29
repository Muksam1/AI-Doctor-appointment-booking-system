const mongoose = require('mongoose');

const appointmentSchema = mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Doctor'
    },
    date: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                // Allow today or future
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return value >= today;
            },
            message: 'Appointment date must be today or in the future'
        }
    },
    timeSlot: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
        default: 'Pending'
    },
    paymentMethod: {
        type: String,
        enum: ['Khalti', 'eSewa', 'Stripe', 'PayPal', 'Cash']
    },
    fee: {
        type: Number,
        required: true,
        min: 0
    },
    prescription: {
        type: String // URL to PDF/Image
    },
    notes: {
        type: String
    },
    reminded: {
        type: Boolean,
        default: false
    },
    remindedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Add index to prevent double booking of the same slot
// We use a partial filter to allow re-booking if the previous appointment was Cancelled
// Note: Partial indexes in MongoDB allow uniqueness only for items matching the filter
appointmentSchema.index(
    { doctor: 1, date: 1, timeSlot: 1 },
    { 
        unique: true, 
        partialFilterExpression: { status: { $ne: 'Cancelled' } } 
    }
);

// Add indexes for efficient queries
appointmentSchema.index({ patient: 1, doctor: 1, date: 1 });
appointmentSchema.index({ status: 1, date: 1 });
appointmentSchema.index({ paymentStatus: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
