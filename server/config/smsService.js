const axios = require('axios');

// SMS Service for Nepal (using Sparrowsms as example)
class SMSService {
    constructor() {
        this.apiUrl = process.env.SMS_API_URL || 'https://api.sparrowsms.com/v2/sms/';
        this.token = process.env.SMS_API_TOKEN;
        this.sender = process.env.SMS_SENDER_ID || 'HealSync';
    }

    async sendSMS(phoneNumber, message) {
        try {
            if (!this.token || this.token.includes('your_sparrowsms_token')) {
                console.log('----------------------------------------------------');
                console.log(`MOCK SMS SENT TO: ${phoneNumber}`);
                console.log(`MESSAGE: ${message}`);
                console.log('----------------------------------------------------');
                return { messageId: 'mock-sms-123' };
            }

            // Remove any + or 00 prefix and ensure Nepali format
            const cleanNumber = phoneNumber.replace(/^\+?/, '').replace(/^00/, '');

            const response = await axios.post(this.apiUrl, {
                to: cleanNumber,
                from: this.sender,
                text: message
            }, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('SMS sent successfully:', response.data);
            return { messageId: response.data.id };
        } catch (error) {
            console.error('SMS sending failed:', error.response?.data || error.message);
            throw new Error(`SMS sending failed: ${error.message}`);
        }
    }

    // Send appointment reminder
    async sendAppointmentReminder(phoneNumber, doctorName, date, time) {
        const message = `HealSync Reminder: You have an appointment with Dr. ${doctorName} on ${date} at ${time}. Please arrive 15 minutes early.`;
        return this.sendSMS(phoneNumber, message);
    }

    // Send appointment confirmation
    async sendAppointmentConfirmation(phoneNumber, doctorName, date, time) {
        const message = `HealSync: Your appointment with Dr. ${doctorName} on ${date} at ${time} has been confirmed.`;
        return this.sendSMS(phoneNumber, message);
    }

    // Send payment confirmation
    async sendPaymentConfirmation(phoneNumber, amount) {
        const message = `HealSync: Payment of Rs. ${amount} received successfully. Thank you for using our service.`;
        return this.sendSMS(phoneNumber, message);
    }
}

module.exports = new SMSService();