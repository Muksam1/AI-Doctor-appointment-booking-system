const mongoose = require('mongoose');

const reviewSchema = mongoose.Schema({
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
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Appointment'
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        required: true,
        maxlength: 100
    },
    comment: {
        type: String,
        required: true,
        maxlength: 1000
    },
    isVerified: {
        type: Boolean,
        default: false // Only verified after appointment completion
    },
    helpful: {
        type: Number,
        default: 0
    },
    reported: {
        type: Boolean,
        default: false
    },
    reportReason: {
        type: String,
        maxlength: 500,
        validate: {
            validator: function(value) {
                // If reported is true, reason is required
                return !this.reported || (value && value.length > 0);
            },
            message: 'Reason required when review is reported'
        }
    },
    response: {
        doctorResponse: String,
        respondedAt: Date
    }
}, {
    timestamps: true
});

// Prevent duplicate reviews for same appointment
reviewSchema.index({ appointment: 1 }, { unique: true });

// Update doctor's average rating when review is saved
reviewSchema.post('save', async function() {
    try {
        const Doctor = mongoose.model('Doctor');
        const Review = mongoose.model('Review');

        const result = await Review.aggregate([
            { $match: { doctor: this.doctor, isVerified: true } },
            {
                $group: {
                    _id: '$doctor',
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 }
                }
            }
        ]);

        if (result.length > 0) {
            await Doctor.findByIdAndUpdate(this.doctor, {
                ratings: Math.round(result[0].averageRating * 10) / 10,
                numReviews: result[0].totalReviews
            });
        }
    } catch (error) {
        console.error('Error updating doctor rating:', error);
        // Don't throw - prevent review save from failing
    }
});

// Update doctor's rating when review is removed
reviewSchema.post('remove', async function() {
    try {
        const Doctor = mongoose.model('Doctor');
        const Review = mongoose.model('Review');

        const result = await Review.aggregate([
            { $match: { doctor: this.doctor, isVerified: true } },
            {
                $group: {
                    _id: '$doctor',
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 }
                }
            }
        ]);

        if (result.length > 0) {
            await Doctor.findByIdAndUpdate(this.doctor, {
                ratings: Math.round(result[0].averageRating * 10) / 10,
                numReviews: result[0].totalReviews
            });
        } else {
            // No reviews left
            await Doctor.findByIdAndUpdate(this.doctor, {
                ratings: 0,
                numReviews: 0
            });
        }
    } catch (error) {
        console.error('Error updating doctor rating on remove:', error);
        // Don't throw - prevent review removal from failing
    }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
