# HealSync: Server Architecture Guide (Expanded)

This documentation provides an in-depth overview of the server-side architecture for the **HealSync: AI Doctor Appointment Booking System**. It explains the purpose of each folder, the role of real-time communication via Socket.io, and the critical configuration needed for a secure production environment.

---

## 🏗️ Detailed Folder Structure Breakdown

| Folder | Detailed Purpose | Key Responsibilities & Examples |
| :--- | :--- | :--- |
| **`controllers/`** | **Business Logic Layer** | Contains functions that bridge the gap between routes and models. <br>• `paymentController.js`: Manages eSewa signature generation and Khalti verification logic.<br>• `appointmentController.js`: Handles complex logic for slot booking, preventing double-bookings and managing status transitions. |
| **`models/`** | **Data Modeling (ODM)** | Defines Mongoose schemas for MongoDB collections.<br>• `User.js`: Stores credentials, roles, and profile info.<br>• `Doctor.js`: Extends user data with clinical details, fees, and license info.<br>• `Appointment.js`: Tracks the relationship between patient, doctor, and payment. |
| **`routes/`** | **Navigation & Access Control** | Defines the API entry points and attaches required middleware.<br>• Maps `POST /api/payments/verify` to `paymentController.verifyPayment`.<br>• Implements versioning or grouping (e.g., all admin routes under `/api/admin`). |
| **`middleware/`** | **Request Interceptors** | Secure filters that run before business logic.<br>• `authMiddleware.js`: Decodes JWT tokens to populate `req.user`.<br>• `uploadMiddleware.js`: Uses **Multer** to handle file/image uploads for doctor licenses or profile pictures. |
| **`config/`** | **Environment & Integration** | Global settings and external service initializations.<br>• `db.js`: MongoDB connection strings and retry logic.<br>• `sendEmail.js`: Configuration for Nodemailer (SMTP) or external providers like SendGrid. |
| **`utils/`** | **Utility & Background Tasks** | Helper functions and automated services.<br>• `scheduler.js`: Uses `node-cron` to send automated reminders and daily schedule summaries.<br>• `pdfGenerator.js`: Logic for creating downloadable medical reports or invoices. |

---

## ⚡ Real-Time Communication with Socket.io

### 🔹 What is Socket.io?
Socket.io is a library that enables **low-latency, bi-directional, and event-based communication** between the browser and the server. Unlike standard HTTP requests (where the client must ask for data), Socket.io allows the server to "push" updates to the client instantly.

### 🔹 When to Use It?
- **Instant Messaging**: When a patient chats with a doctor, the message must appear instantly without refreshing.
- **Live Notifications**: Alerting a doctor the moment a new appointment is booked.
- **Status Updates**: Updating the appointment status on the patient's screen immediately after payment success.

### 🔹 Folder Location & Setup
- **Initialization**: Located in `server/index.js`. The server is wrapped in a `http.Server` to allow both standard API calls and Socket connections on the same port.
- **Instance Management**: `server/socket.js` exports `getIO()` and `setIO()`. This allows other files (like controllers) to trigger socket events from anywhere in the system.
- **Event Logic**: Inside `server/index.js`, the `io.on('connection')` block manages user "rooms" (joining by `userId`) and event listeners like `sendMessage` and `markRead`.

### 🔹 How to Use It (The Code Flow)
1. **Connect**: client connects and sends a `join` event with their `userId`.
2. **Room**: The server puts that user in a virtual "room" named after their ID (`socket.join(userId)`).
3. **Emit**: When a notification is created in `notificationController.js`, we call `getIO().to(userId).emit('notification', data)`.

---

## 📁 Key Server Files

### `index.js` (The Heart)
- **CORS Configuration**: Restricts API access to specific frontend domains (Localhost vs. Production URL).
- **Global Error Handling**: Catches all unhandled errors and formats them into clean JSON responses.
- **Middleware Chain**: Sets up body parsers (JSON/URL-encoded) and static file serving for the `/uploads` folder.

### `.env` (The Security Pillar)
- **JWT_SECRET**: Key used to sign and verify login tokens.
- **MONGO_URI**: The secret connection string to your database.
- **GATEWAY_KEYS**: Private API keys for eSewa, Khalti, and SMS services.
- **ADMIN_INITIAL**: Default credentials used by `config/seedAdmin.js` to create the first system administrator.

---

## 🚀 Architectural Features Summary

1. **Scalable Design**: Folders are separated by concern, making it easy for multiple developers to work on different features simultaneously.
2. **Security-First**: Every sensitive route is protected by JWT and Role-Based Access Control (RBAC) ensuring data privacy.
3. **Automated Reliability**: Inclusion of `utils/scheduler.js` ensures that patients never miss an appointment through automated background reminders.
4. **Resilient Payments**: The integration with eSewa v2 and Khalti uses digital signatures and secret keys to ensure financial data is never tampered with.
5. **Real-time UX**: By integrating Socket.io with the notification system, HealSync provides a modern app-like experience where users are updated in milliseconds.

---
*HealSync - Technical Documentation v2 - Antigravity AI*
