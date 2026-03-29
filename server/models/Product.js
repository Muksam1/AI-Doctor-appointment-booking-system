const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true,
        enum: ['Medicines', 'Wellness', 'Mother & Baby', 'Devices', 'General']
    },
    description: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 5000
    },
    image: {
        type: String,
        default: '',
        validate: {
            validator: function(value) {
                if (!value) return true;
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            },
            message: 'Invalid image URL'
        }
    },
    icon: {
        type: String, // String representation of icon name if no image
        default: 'FaCapsules'
    },
    badge: {
        type: String,
        default: ''
    },
    countInStock: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Add indexes
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text' }); // For search

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
