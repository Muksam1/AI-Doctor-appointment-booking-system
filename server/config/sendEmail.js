const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    try {
        if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your_email')) {
            console.log('----------------------------------------------------');
            console.log(`MOCK EMAIL SENT TO: ${options.to || options.email}`);
            console.log(`SUBJECT: ${options.subject}`);
            console.log(`BODY: ${options.html || options.message || options.text}`);
            console.log('----------------------------------------------------');
            // Mock success in development since credentials aren't set
            return { success: true, messageId: 'mock-id-123' };
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `Doctor Booking <${process.env.EMAIL_USER}>`,
            to: options.to || options.email,
            subject: options.subject,
            text: options.message || options.text,
            html: options.html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Email sending failed:', error.message);
        throw error;
    }
};

module.exports = sendEmail;
