const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const { setIO } = require('./socket');

dotenv.config();

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

connectDB().then(() => seedAdmin());

const app = express();

const { initReminders } = require('./utils/scheduler');

// Start automated background tasks
initReminders();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const path = require('path');

// Expose io instance for other modules (controllers) to emit events
setIO(io);

app.use(cors());
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

            // 2. Emit to Receiver
            io.to(receiverId).emit('receiveMessage', {
                _id: newMessage._id,
                sender: senderId,
                receiver: receiverId,
                text,
                type: type || 'text',
                mediaUrl,
                timestamp: newMessage.timestamp,
                isRead: false
            });
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
            // Optional: emit 'readStatusUpdate' to sender
            io.to(senderId).emit('messageRead', { receiverId });
        } catch (error) {
            console.error("Error marking message as read:", error);
        }
    });

    socket.on('disconnect', () => {
        // Log can be removed for cleaner production logs
    });
});

// Attach io to app to use in controllers
app.set('socketio', io);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running in mode on port ${PORT}`);
});
