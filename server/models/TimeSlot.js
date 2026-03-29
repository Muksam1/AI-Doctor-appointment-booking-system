const mongoose = require('mongoose');

const timeSlotSchema = mongoose.Schema({
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Doctor'
    },
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true // Format: "HH:MM"
    },
    endTime: {
        type: String,
        required: true // Format: "HH:MM"
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    isBooked: {
        type: Boolean,
        default: false
    },
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
timeSlotSchema.index({ doctor: 1, date: 1, startTime: 1 }, { unique: true });

// Prevent overlapping slots
timeSlotSchema.pre('save', async function(next) {
    const TimeSlot = mongoose.model('TimeSlot');

    const overlappingSlot = await TimeSlot.findOne({
        doctor: this.doctor,
        date: this.date,
        $or: [
            {
                $and: [
                    { startTime: { $lt: this.endTime } },
                    { endTime: { $gt: this.startTime } }
                ]
            }
        ],
        _id: { $ne: this._id }
    });

    if (overlappingSlot) {
        const error = new Error('Time slot overlaps with existing slot');
        return next(error);
    }

    next();
});

const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);

module.exports = TimeSlot;