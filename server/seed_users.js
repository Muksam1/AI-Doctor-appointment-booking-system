const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Doctor = require('./models/Doctor');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const seedUsers = async () => {
    await connectDB();

    try {
        // Clear existing test users if needed, or just append. 
        // For safety, let's just append but check if they exist to avoid duplicates if run multiple times.
        // Actually, user asked to "register" them.

        console.log('Seeding users...');

        const patients = [];
        const doctors = [];

        // Create 10 Patients
        for (let i = 1; i <= 10; i++) {
            const email = `patient${i}@example.com`;
            const userExists = await User.findOne({ email });

            if (!userExists) {
                patients.push({
                    name: `Patient ${i}`,
                    email: email,
                    password: 'password123', // Will be hashed by pre-save hook
                    role: 'patient',
                    contact: `98000000${i.toString().padStart(2, '0')}`,
                    isVerified: true
                });
            } else {
                console.log(`User ${email} already exists`);
            }
        }

        // Create 10 Doctors
        for (let i = 1; i <= 10; i++) {
            const email = `doctor${i}@example.com`;
            const userExists = await User.findOne({ email });

            if (!userExists) {
                // For doctors we need to create the User first, then the Doctor profile
                doctors.push({
                    name: `Doctor ${i}`,
                    email: email,
                    password: 'password123',
                    role: 'doctor',
                    contact: `98111111${i.toString().padStart(2, '0')}`,
                    isVerified: true,
                    // Doctor specific dummy data
                    specialization: ['Cardiology', 'Dermatology', 'General', 'Neurology', 'Pediatrics'][i % 5],
                    fee: 500 + (i * 50),
                    experience: i + 2
                });
            } else {
                console.log(`User ${email} already exists`);
            }
        }

        // Insert Patients
        for (const patientData of patients) {
            const user = await User.create(patientData);
            console.log(`Created Patient: ${user.name}`);
        }

        // Insert Doctors
        for (const doctorData of doctors) {
            const { specialization, fee, experience, ...userData } = doctorData;
            const user = await User.create(userData);

            await Doctor.create({
                user: user._id,
                specialization,
                fee,
                experience,
                bio: `I am Dr. ${user.name}, a specialist in ${specialization} with ${experience} years of experience.`,
                availability: [
                    { day: 'Monday', slots: ['10:00', '11:00'] },
                    { day: 'Wednesday', slots: ['14:00', '15:00'] }
                ]
            });
            console.log(`Created Doctor: ${user.name}`);
        }

        console.log('Data Imported!');
        process.exit();

    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

seedUsers();
