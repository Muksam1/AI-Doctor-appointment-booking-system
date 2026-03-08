const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://muksam2006_db_user:Muksamlimbu123@cluster0.7r1kykl.mongodb.net/";

const userSchema = new mongoose.Schema({
    name: String,
    role: String
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const fixUserRole = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        console.log('Finding user "Muksam Limbu"...');
        const user = await User.findOneAndUpdate(
            { name: 'Muksam Limbu' }, // Find user by name
            { role: 'patient' },       // Update role
            { new: true }              // Return the updated user
        );

        if (user) {
            console.log(`Successfully updated ${user.name} back to role: ${user.role}`);
        } else {
            console.warn('User "Muksam Limbu" NOT FOUND. Please check the name spelling.');
        }

        await mongoose.disconnect();
        console.log('Disconnected.');
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
};

fixUserRole();
