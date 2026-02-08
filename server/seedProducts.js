const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI);

const products = [
    {
        name: 'Premium Multivitamin Complex',
        price: 1250,
        category: 'Wellness',
        description: 'Daily essential nutrients for peak performance.',
        icon: 'FaCapsules',
        badge: 'Best Seller',
        countInStock: 50
    },
    {
        name: 'Organic Sleep Aid (60 Caps)',
        price: 850,
        category: 'Wellness',
        description: 'Natural herbal formula for restful sleep.',
        icon: 'FaCapsules',
        countInStock: 30
    },
    {
        name: 'Digital Blood Pressure Monitor',
        price: 4200,
        category: 'Devices',
        description: 'Clinical accuracy for home health tracking.',
        icon: 'FaStethoscope',
        countInStock: 15
    },
    {
        name: 'Infant Gentle Lotion',
        price: 650,
        category: 'Mother & Baby',
        description: 'Hypoallergenic skin care for newborns.',
        icon: 'FaBaby',
        countInStock: 25
    },
    {
        name: 'Fish Oil Omega-3 (1000mg)',
        price: 1800,
        category: 'Wellness',
        description: 'Supports heart, brain, and joint health.',
        icon: 'FaHeartbeat',
        countInStock: 40
    },
    {
        name: 'Paracetamol 500mg (Strip of 10)',
        price: 40,
        category: 'Medicines',
        description: 'Quick relief from fever and mild pain.',
        icon: 'FaCapsules',
        countInStock: 100
    }
];

const seedProducts = async () => {
    try {
        await Product.deleteMany();
        await Product.insertMany(products);
        console.log('Products seeded successfully');
        process.exit();
    } catch (error) {
        console.error('Error seeding products:', error);
        process.exit(1);
    }
};

seedProducts();
