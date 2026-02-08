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
        default: 0
    },
    category: {
        type: String,
        required: true,
        enum: ['Medicines', 'Wellness', 'Mother & Baby', 'Devices', 'General']
    },
    description: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: ''
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
        default: 0
    }
}, {
    timestamps: true
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
