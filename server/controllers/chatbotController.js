// Basic rule-based AI Health Assistant for symptom triage
const symptoms = {
    "fever": "You may have a viral infection. Drink plenty of fluids and rest. If it persists, consult a general physician.",
    "cough": "Could be a common cold or allergy. Use warm water and steam. If accompanied by shortness of breath, see a doctor immediately.",
    "headache": "Likely due to stress, dehydration, or lack of sleep. Rest in a dark room and stay hydrated.",
    "stomach ache": "Could be indigestion or food poisoning. Avoid heavy meals. If pain is severe/localized, consult a doctor.",
};

const triageSymptom = (message) => {
    const msg = message.toLowerCase();
    for (let symptom in symptoms) {
        if (msg.includes(symptom)) {
            return symptoms[symptom];
        }
    }
    return "I'm not sure about specific symptoms, but I recommend consulting a professional if you feel unwell. Would you like to see available doctors?";
};

const handleChatbot = async (req, res) => {
    const { message } = req.body;
    let response = "";

    if (message.toLowerCase().includes("book") || message.toLowerCase().includes("appointment")) {
        response = "To book an appointment, go to the 'Doctors' page, select a doctor, and choose an available time slot.";
    } else {
        response = triageSymptom(message);
    }

    res.json({
        reply: response,
        disclaimer: "Disclaimer: This is an AI assistant, not a medical diagnosis. For emergencies, please call help immediately."
    });
};

module.exports = { handleChatbot };
