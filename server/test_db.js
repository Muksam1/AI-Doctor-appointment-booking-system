const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        console.log("Attempting to connect to MongoDB...");
        console.log(`URI: ${process.env.MONGODB_URI}`);
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
        });
        console.log("SUCCESS: Connected to MongoDB!");
        process.exit(0);
    } catch (error) {
        console.error("FAILURE: Could not connect to MongoDB.");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        if (error.reason) console.error("Error Reason:", error.reason);
        process.exit(1);
    }
};

connectDB();
