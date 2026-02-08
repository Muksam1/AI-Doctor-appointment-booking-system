const mongoose = require('mongoose');

const doctorSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    specialization: {
        type: String,
        required: true
    },
    experience: {
        type: Number,
        default: 0
    },
    bio: {
        type: String
    },
    fee: {
        type: Number,
        required: true,
        default: 0
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    availability: [
        {
            day: { type: String, required: true },
            slots: [{ type: String }] // e.g. ["09:00", "10:00"]
        }
    ],
    ratings: {
        type: Number,
        default: 0
    },
    numReviews: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
