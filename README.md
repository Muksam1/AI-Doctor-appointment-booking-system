# Doctor Appointment Booking System (HealSync)

Fully functional MERN stack application for managing doctor appointments.

## Features
- **Patient**: Search doctors, real-time booking, payment integration (Stripe/Khalti).
- **Doctor**: Dashboard, slot management, appointment approval.
- **Admin**: Revenue analytics, doctor verification.
- **AI Chatbot**: Symptom triage and booking help.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Redux/Context.
- **Backend**: Node.js, Express, Socket.io, JWT.
- **Database**: MongoDB (Mongoose).

## Setup
1. **Server**:
   ```bash
   cd server
   npm install
   # Configure .env with MONGODB_URI, JWT_SECRET, etc.
   npm start
   ```
2. **Client**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

## Local Verification
- Login as Admin (manually set role in DB) to verify doctors.
- Sign up as Doctor to manage slots.
- Sign up as Patient to book and pay.
