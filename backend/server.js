import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { poolPromise, sql } from './db.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://192.168.1.150:5173"],
        methods: ["GET", "POST"]
    }
});

app.set('io', io);

// Socket.io connection logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join a private room for a specific doctor-patient pair
    socket.on('join-chat', ({ room }) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
    });

    // Relay private message to the room
    socket.on('send-message', async ({ room, message, sender }) => {
        try {
            const pool = await poolPromise;
            const timestamp = new Date();

            // Save to database
            await pool.request()
                .input('room', sql.NVarChar, room)
                .input('sender', sql.NVarChar, sender)
                .input('message', sql.NVarChar, message)
                .input('timestamp', sql.DateTime, timestamp)
                .query('INSERT INTO Messages (Room, Sender, Message, Timestamp) VALUES (@room, @sender, @message, @timestamp)');

            // Broadcast to the room
            io.to(room).emit('receive-message', {
                room: room,
                text: message,
                sender: sender,
                timestamp: timestamp.toISOString()
            });
        } catch (err) {
            console.error("Socket send-message error:", err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Import Routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import superadminRoutes from './routes/superadmin.js';
import appointmentRoutes from './routes/appointments.js';
import chatRoutes from './routes/chat.js';
import notificationRoutes from './routes/notifications.js';

// Use Routes
app.use('/api', authRoutes);
app.use('/api', adminRoutes);
app.use('/api', superadminRoutes);
app.use('/api/notifications', (req, res, next) => { console.log('notif hit'); next(); }); // Debug
app.use('/api', appointmentRoutes);
app.use('/api', chatRoutes);
app.use('/api', notificationRoutes);

// Reminder System (runs every hour)
const checkReminders = async () => {
    try {
        const pool = await poolPromise;
        // Find appointments 3 days or 1 day away
        const result = await pool.request().query(`
            SELECT a.*, d.FullName 
            FROM Appointments a
            JOIN Doctors d ON a.DoctorId = d.Id
            WHERE a.AppointDate IN (
                CONVERT(date, DATEADD(day, 3, GETDATE())),
                CONVERT(date, DATEADD(day, 1, GETDATE()))
            )
        `);

        for (const appt of result.recordset) {
            const daysLeft = Math.ceil((new Date(appt.AppointDate) - new Date()) / (1000 * 60 * 60 * 24));
            const msg = `เตือนนัดหมาย: อีก ${daysLeft} วัน คุณมีนัดกับ ${appt.FullName}`;

            // Check if reminder already sent today to avoid spam
            const check = await pool.request()
                .input('uid', sql.INT, appt.UserId)
                .input('msg', sql.NVarChar, msg)
                .query('SELECT Id FROM Notifications WHERE UserId = @uid AND Message = @msg AND CAST(CreatedAt as DATE) = CAST(GETDATE() as DATE)');

            if (check.recordset.length === 0) {
                await pool.request()
                    .input('uid', sql.INT, appt.UserId)
                    .input('msg', sql.NVarChar, msg)
                    .query('INSERT INTO Notifications (UserId, Message) VALUES (@uid, @msg)');
                io.emit('notification', { userId: appt.UserId });
            }
        }
    } catch (err) {
        console.error("Reminder check failed:", err);
    }
};

setInterval(checkReminders, 1000 * 60 * 60); // Every hour
checkReminders(); // Run once at start

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
