const mongoose = require('mongoose');

const patientSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    dob: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
        default: 'Prefer not to say'
    },
    bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
        default: 'Unknown'
    },
    address: {
        type: String
    },
    bio: {
        type: String
    },
    emergencyContact: {
        type: String
    },
    // Medical History Fields
    medicalConditions: [{
        type: String
    }],
    allergies: [{
        type: String
    }],
    currentMedications: [{
        name: { type: String, required: true },
        dosage: { type: String },
        frequency: { type: String },
        prescribedBy: { type: String },
        startDate: { type: Date },
        endDate: { type: Date }
    }],
    pastSurgeries: [{
        procedure: { type: String, required: true },
        date: { type: Date },
        hospital: { type: String },
        notes: { type: String }
    }],
    familyHistory: [{
        condition: { type: String, required: true },
        relation: { type: String },
        notes: { type: String }
    }],
    vaccinationRecords: [{
        vaccine: { type: String, required: true },
        date: { type: Date },
        administeredBy: { type: String },
        nextDueDate: { type: Date }
    }],
    smokingStatus: {
        type: String,
        enum: ['Never', 'Former', 'Current', 'Prefer not to say'],
        default: 'Prefer not to say'
    },
    alcoholConsumption: {
        type: String,
        enum: ['None', 'Occasional', 'Moderate', 'Heavy', 'Prefer not to say'],
        default: 'Prefer not to say'
    },
    exerciseHabits: {
        type: String
    },
    dietaryRestrictions: [{
        type: String
    }]
}, {
    timestamps: true
});

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
