const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Models
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');

dotenv.config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI;

const seedDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected for seeding...');

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('password123', salt);

        // 1. Create Patient
        let patientUser = await User.findOne({ email: 'patient@test.com' });
        if (!patientUser) {
            patientUser = await User.create({
                name: 'Test Patient',
                email: 'patient@test.com',
                password: passwordHash,
                role: 'patient'
            });
            console.log('Test Patient created.');
        }

        // 2. Create Doctor
        let doctorUser = await User.findOne({ email: 'doctor@test.com' });
        if (!doctorUser) {
            doctorUser = await User.create({
                name: 'Test Doctor',
                email: 'doctor@test.com',
                password: passwordHash,
                role: 'doctor'
            });
            console.log('Test Doctor User created.');
        }

        let doctorProfile = await Doctor.findOne({ user: doctorUser._id });
        if (!doctorProfile) {
            doctorProfile = await Doctor.create({
                user: doctorUser._id,
                specialization: 'General Medicine',
                experience: 10,
                fee: 500,
                bio: 'A highly experienced test doctor.',
                licenseNumber: 'DOC-TEST-001',
                isVerified: false,
                applicationStatus: 'pending',
                availability: [
                    { 
                        day: 'Monday', 
                        isAvailable: true, 
                        slots: [{ startTime: '10:00', endTime: '11:00' }] 
                    }
                ]
            });
            console.log('Doctor Profile created (Pending).');
        }

        await mongoose.disconnect();
        console.log('Seeding Complete.');
    } catch (err) {
        console.error(err);
    }
};

seedDB();
