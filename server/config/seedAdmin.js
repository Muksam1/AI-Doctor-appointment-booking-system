const User = require('../models/User');

const seedAdmin = async () => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });

        if (!adminExists) {
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@healsync.com';
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

            await User.create({
                name: 'System Admin',
                email: adminEmail,
                password: adminPassword,
                role: 'admin',
                contact: '0000000000',
                isVerified: true
            });

            console.log(`Admin account created with email: ${adminEmail}`);
        } else {
            console.log('Admin account already exists.');
        }
    } catch (error) {
        console.error('Error seeding admin:', error);
    }
};

module.exports = seedAdmin;
