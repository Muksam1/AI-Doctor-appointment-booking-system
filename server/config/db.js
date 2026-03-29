const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Database connected successfully');
        return true;
    } catch (error) {
        console.error(`Error: ${error.message}`);
        throw error;
    }
};

module.exports = connectDB;
