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
        type: String,
        maxlength: 1000
    },
    fee: {
        type: Number,
        required: true,
        min: 0
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    applicationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    education: [{
        degree: String,
        institution: String,
        year: Number
    }],
    languages: [{
        type: String
    }],
    availability: [{
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            required: true
        },
        isAvailable: {
            type: Boolean,
            default: true
        },
        slots: [{
            startTime: {
                type: String,
                required: true
            },
            endTime: {
                type: String,
                required: true
            },
            isBooked: {
                type: Boolean,
                default: false
            }
        }]
    }],
    customAvailability: [{
        date: {
            type: Date,
            required: true
        },
        isAvailable: {
            type: Boolean,
            default: true
        },
        slots: [{
            startTime: {
                type: String,
                required: true
            },
            endTime: {
                type: String,
                required: true
            }
        }]
    }],
    ratings: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    numReviews: {
        type: Number,
        default: 0
    },
    totalAppointments: {
        type: Number,
        default: 0
    },
    profileImage: {
        type: String,
        default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
    },
    licenseNumber: {
        type: String,
        required: true
    },
    clinicAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    emergencyContact: {
        name: String,
        phone: String,
        relation: String
    },
    rejectionReason: {
        type: String,
        default: ''
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for reviews
doctorSchema.virtual('reviews', {
    ref: 'Review',
    localField: '_id',
    foreignField: 'doctor'
});

// Index for efficient queries
doctorSchema.index({ specialization: 1, ratings: -1 });
doctorSchema.index({ 'clinicAddress.city': 1 });

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
