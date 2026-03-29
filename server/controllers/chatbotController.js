const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// AI Health Knowledge Base
const healthKnowledge = {
    symptoms: {
        fever: {
            severity: 'moderate',
            advice: 'Rest, stay hydrated, take fever reducers like acetaminophen. See a doctor if fever >103°F or lasts >3 days.',
            specialists: ['General Medicine', 'Internal Medicine']
        },
        headache: {
            severity: 'mild',
            advice: 'Rest in a quiet, dark room. Use cold compress. Take over-the-counter pain relievers.',
            specialists: ['Neurology', 'General Medicine']
        },
        cough: {
            severity: 'mild',
            advice: 'Stay hydrated, use honey and lemon, consider cough syrup. See doctor if persistent or with fever.',
            specialists: ['Pulmonology', 'General Medicine']
        },
        chest_pain: {
            severity: 'severe',
            advice: 'URGENT: Seek immediate medical attention. Could indicate heart problems.',
            specialists: ['Cardiology', 'Emergency Medicine']
        },
        shortness_of_breath: {
            severity: 'severe',
            advice: 'URGENT: Seek immediate medical attention. Could indicate serious respiratory issues.',
            specialists: ['Pulmonology', 'Emergency Medicine']
        }
    },
    first_aid: {
        bleeding: 'Apply direct pressure with clean cloth. Elevate wound. Seek medical help for severe bleeding.',
        burns: 'Cool with running water for 20 minutes. Cover with clean cloth. Seek medical help for severe burns.',
        choking: 'Perform Heimlich maneuver. Call emergency services if unconscious.',
        fracture: 'Immobilize injured area. Apply ice. Seek immediate medical attention.',
        poisoning: 'Call poison control immediately. Do not induce vomiting unless instructed.'
    },
    specialties: {
        'General Medicine': 'Primary care, routine checkups, common illnesses',
        'Cardiology': 'Heart and cardiovascular diseases',
        'Neurology': 'Brain, spinal cord, and nervous system disorders',
        'Pulmonology': 'Lungs and respiratory system',
        'Dermatology': 'Skin conditions and diseases',
        'Orthopedics': 'Bones, joints, and musculoskeletal system',
        'Pediatrics': 'Child healthcare',
        'Gynecology': 'Women\'s reproductive health',
        'Ophthalmology': 'Eye care and vision',
        'Dentistry': 'Oral health and teeth'
    }
};

// @desc    Process AI Chatbot Message
// @route   POST /api/chatbot/message
// @access  Public
const processChatbotMessage = async (req, res) => {
    try {
        const { message, userId } = req.body;
        const lowerMessage = message.toLowerCase();

        let response = {
            type: 'general',
            message: '',
            suggestions: [],
            urgency: 'low'
        };

        // Health symptom analysis
        if (lowerMessage.includes('symptom') || lowerMessage.includes('feeling') || lowerMessage.includes('pain')) {
            response = analyzeSymptoms(lowerMessage);
        }
        // First aid queries
        else if (lowerMessage.includes('first aid') || lowerMessage.includes('emergency') || lowerMessage.includes('help')) {
            response = provideFirstAid(lowerMessage);
        }
        // Doctor/specialist recommendations
        else if (lowerMessage.includes('specialist') || lowerMessage.includes('doctor for')) {
            response = recommendSpecialist(lowerMessage);
        }
        // Appointment booking help
        else if (lowerMessage.includes('book') || lowerMessage.includes('appointment') || lowerMessage.includes('schedule')) {
            response = helpWithBooking(userId);
        }
        // General health questions
        else if (lowerMessage.includes('health') || lowerMessage.includes('medical') || lowerMessage.includes('disease')) {
            response = provideHealthInfo(lowerMessage);
        }
        // FAQ responses
        else {
            response = handleFAQ(lowerMessage);
        }

        // Log conversation for analytics (optional)
        // await logChatInteraction(userId, message, response);

        res.json(response);
    } catch (error) {
        res.status(500).json({
            type: 'error',
            message: 'I apologize, but I\'m having trouble processing your request. Please try again or contact our support team.',
            suggestions: ['Contact Support', 'Call Emergency: 102']
        });
    }
};

// Symptom Analysis Function
const analyzeSymptoms = (message) => {
    const symptoms = Object.keys(healthKnowledge.symptoms);
    const foundSymptoms = symptoms.filter(symptom => message.includes(symptom));

    if (foundSymptoms.length === 0) {
        return {
            type: 'symptom_analysis',
            message: 'I couldn\'t identify specific symptoms from your message. Please describe your symptoms in more detail.',
            suggestions: ['Describe your symptoms', 'List affected body parts', 'Mention duration and severity'],
            urgency: 'low'
        };
    }

    const primarySymptom = foundSymptoms[0];
    const symptomData = healthKnowledge.symptoms[primarySymptom];

    let urgency = symptomData.severity === 'severe' ? 'high' : 'medium';

    return {
        type: 'symptom_analysis',
        message: `Based on your symptoms, here's some general guidance:\n\n${symptomData.advice}\n\nRecommended specialists: ${symptomData.specialists.join(', ')}`,
        suggestions: [
            'Book an appointment',
            'Call emergency if severe',
            'Describe additional symptoms'
        ],
        urgency,
        specialists: symptomData.specialists
    };
};

// First Aid Guidance
const provideFirstAid = (message) => {
    const emergencies = Object.keys(healthKnowledge.first_aid);
    const foundEmergency = emergencies.find(emergency => message.includes(emergency));

    if (foundEmergency) {
        return {
            type: 'first_aid',
            message: `EMERGENCY FIRST AID GUIDANCE:\n\n${healthKnowledge.first_aid[foundEmergency]}\n\n⚠️ This is general guidance only. Always seek professional medical help.`,
            suggestions: ['Call Emergency: 102', 'Find nearest hospital', 'Contact ambulance'],
            urgency: 'high'
        };
    }

    return {
        type: 'first_aid',
        message: 'For medical emergencies, please call emergency services immediately (102). For general first aid questions, please specify the situation.',
        suggestions: ['Call Emergency: 102', 'Specify the emergency type'],
        urgency: 'high'
    };
};

// Specialist Recommendations
const recommendSpecialist = async (message) => {
    const specialties = Object.keys(healthKnowledge.specialties);
    const foundSpecialty = specialties.find(specialty =>
        message.toLowerCase().includes(specialty.toLowerCase())
    );

    if (foundSpecialty) {
        // Find doctors with this specialty
        const doctors = await Doctor.find({
            specialization: foundSpecialty,
            isVerified: true
        }).limit(3).populate('user', 'name');

        const doctorList = doctors.map(doc => `${doc.user.name} (${doc.fee} NPR)`).join(', ');

        return {
            type: 'specialist_recommendation',
            message: `${healthKnowledge.specialties[foundSpecialty]}\n\nAvailable ${foundSpecialty} doctors: ${doctorList || 'Please check our doctor directory'}`,
            suggestions: ['View all doctors', 'Book appointment', 'Compare fees'],
            urgency: 'low',
            doctors: doctors
        };
    }

    return {
        type: 'specialist_recommendation',
        message: 'We have specialists in: Cardiology, Neurology, Orthopedics, Pediatrics, Gynecology, Dermatology, and more. What type of specialist are you looking for?',
        suggestions: ['List all specialties', 'Search by condition'],
        urgency: 'low'
    };
};

// Booking Assistance
const helpWithBooking = async (userId) => {
    if (!userId) {
        return {
            type: 'booking_help',
            message: 'To book an appointment, you need to be logged in. Would you like me to guide you through the booking process?',
            suggestions: ['Login to continue', 'Create account', 'Browse doctors'],
            urgency: 'low'
        };
    }

    // Get user's recent appointments
    const recentAppointments = await Appointment.find({ patient: userId })
        .sort({ createdAt: -1 })
        .limit(2)
        .populate('doctor', 'specialization fee')
        .populate('doctor.user', 'name');

    const hasRecentAppointments = recentAppointments.length > 0;

    return {
        type: 'booking_help',
        message: hasRecentAppointments
            ? `Welcome back! I see you have ${recentAppointments.length} recent appointment(s). How can I help you book a new appointment?`
            : 'I can help you book an appointment with our verified doctors. What type of doctor are you looking for?',
        suggestions: ['Find doctor by specialty', 'Search by location', 'View available slots'],
        urgency: 'low',
        recentAppointments: recentAppointments
    };
};

// General Health Information
const provideHealthInfo = (message) => {
    const healthTopics = {
        'blood pressure': 'Normal blood pressure is less than 120/80 mmHg. High blood pressure often has no symptoms but can lead to serious health problems.',
        'diabetes': 'Diabetes affects how your body uses blood sugar. Type 2 diabetes is most common and can often be managed with lifestyle changes.',
        'cholesterol': 'Cholesterol is essential but high levels can increase heart disease risk. Regular check-ups and healthy diet are important.',
        'vaccination': 'Vaccines help protect against serious diseases. Stay up to date with recommended vaccinations for your age group.',
        'mental health': 'Mental health is as important as physical health. Don\'t hesitate to seek help if you\'re struggling with stress, anxiety, or depression.'
    };

    const foundTopic = Object.keys(healthTopics).find(topic =>
        message.includes(topic)
    );

    if (foundTopic) {
        return {
            type: 'health_info',
            message: healthTopics[foundTopic],
            suggestions: ['Book consultation', 'Learn more', 'Find specialists'],
            urgency: 'low'
        };
    }

    return {
        type: 'health_info',
        message: 'I can provide information on various health topics including blood pressure, diabetes, mental health, and preventive care. What would you like to know more about?',
        suggestions: ['Blood pressure', 'Diabetes', 'Mental health', 'Vaccinations'],
        urgency: 'low'
    };
};

// FAQ Handler
const handleFAQ = (message) => {
    const faqs = {
        'how to book': 'To book an appointment: 1) Browse doctors by specialty, 2) Check their availability, 3) Select a time slot, 4) Complete payment.',
        'payment methods': 'We accept Khalti, eSewa, and international payments via Stripe. All payments are secure and encrypted.',
        'cancel appointment': 'You can cancel appointments up to 24 hours before the scheduled time through your dashboard.',
        'reschedule': 'Appointments can be rescheduled up to 24 hours in advance. Contact the doctor or use your dashboard.',
        'emergency': 'For medical emergencies, call 102 immediately or visit the nearest emergency room.',
        'working hours': 'Our platform is available 24/7. Doctor consultation hours vary by individual schedules.'
    };

    const foundFAQ = Object.keys(faqs).find(faq =>
        message.includes(faq.replace(' ', ''))
    );

    if (foundFAQ) {
        return {
            type: 'faq',
            message: faqs[foundFAQ],
            suggestions: ['Ask another question', 'Contact support', 'Book appointment'],
            urgency: 'low'
        };
    }

    return {
        type: 'general',
        message: 'Hello! I\'m your AI health assistant. I can help you with:\n\n• Symptom analysis and health guidance\n• Finding the right specialist\n• Booking appointments\n• General health information\n• First aid advice\n\nWhat can I help you with today?',
        suggestions: ['Book appointment', 'Health questions', 'Find doctor', 'Emergency help'],
        urgency: 'low'
    };
};

// @desc    Get chatbot analytics (Admin only)
// @route   GET /api/chatbot/analytics
// @access  Private/Admin
const getChatbotAnalytics = async (req, res) => {
    try {
        // This would typically aggregate from a chat logs collection
        const analytics = {
            totalConversations: 0,
            commonQueries: ['symptoms', 'booking', 'specialists'],
            satisfaction: 4.2,
            emergencyRedirects: 15
        };

        res.json(analytics);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    processChatbotMessage,
    getChatbotAnalytics
};