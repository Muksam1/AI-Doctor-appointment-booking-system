const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { setIO } = require('./socket');

const connectDB = require('./config/db');
const seedAdmin = require('./config/seedAdmin');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminStatsRoutes = require('./routes/adminStatsRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const patientRoutes = require('./routes/patientRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');

const { initReminders } = require('./utils/scheduler');

// Connect to database and seed admin
connectDB().then(() => seedAdmin());

// Start automated background tasks
initReminders();

// Normalize origin helper
const normalizeOrigin = (value) => {
    if (!value) return '';
    try {
        return new URL(value).origin;
    } catch {
        return value.trim().replace(/\/+$/, '');
    }
};

const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173'
]
    .map(normalizeOrigin)
    .filter(Boolean);

console.log('Allowed Origins:', allowedOrigins);

const corsOptions = {
    origin: (origin, callback) => {
        const normalizedOrigin = normalizeOrigin(origin);
        if (!origin || allowedOrigins.includes(normalizedOrigin)) {
            return callback(null, true);
        }
        console.log('CORS blocked origin:', origin);
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
};

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors: corsOptions
});

// Expose io instance for other modules (controllers) to emit events
setIO(io);

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/stats', adminStatsRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

const Message = require('./models/Message');

// Socket.io connection logic
io.on('connection', (socket) => {
    socket.on('join', (userId) => {
        socket.join(userId);
    });

    socket.on('sendMessage', async ({ senderId, receiverId, text, type, mediaUrl, timestamp }) => {
        try {
            // 1. Save to Database
            const newMessage = new Message({
                sender: senderId,
                receiver: receiverId,
                text,
                type: type || 'text',
                mediaUrl,
                timestamp: timestamp ? new Date(timestamp) : new Date()
            });
            await newMessage.save();

            // 2. Fetch sender name for notification
            const SenderUser = require('./models/User');
            const sender = await SenderUser.findById(senderId).select('name').lean();
            const senderName = sender ? sender.name : 'Someone';

            // 3. Emit to Receiver (include senderName for toast display)
            io.to(receiverId).emit('receiveMessage', {
                _id: newMessage._id,
                senderId: senderId,
                senderName: senderName,
                receiver: receiverId,
                text,
                type: type || 'text',
                mediaUrl,
                timestamp: newMessage.timestamp,
                isRead: false
            });

            // 4. Create persistent DB notification for receiver
            try {
                const { createNotification } = require('./controllers/notificationController');
                const preview = text.length > 60 ? text.substring(0, 60) + '...' : text;
                await createNotification(
                    receiverId,
                    'system',
                    'New Message',
                    `New message from ${senderName}: "${preview}"`,
                    { senderId }
                );
            } catch (notifErr) {
                console.error('Failed to create chat notification:', notifErr.message);
            }
        } catch (error) {
            console.error("Error saving message:", error);
        }
    });

    socket.on('markRead', async ({ messageId, senderId, receiverId }) => {
        try {
            if (messageId) {
                await Message.findByIdAndUpdate(messageId, { isRead: true });
            } else if (senderId && receiverId) {
                await Message.updateMany(
                    { sender: senderId, receiver: receiverId, isRead: false },
                    { isRead: true }
                );
            }
            io.to(senderId).emit('messageRead', { receiverId });
        } catch (error) {
            console.error("Error marking message as read:", error);
        }
    });

    socket.on('disconnect', () => {
        // Clean disconnect
    });
});

// Attach io to app to use in controllers
app.set('socketio', io);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});