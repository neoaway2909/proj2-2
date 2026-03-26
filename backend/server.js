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
        origin: ["http://localhost:5173", "http://192.168.1.150:5173", "http://localhost:5174"],
        methods: ["GET", "POST"]
    }
});

app.set('io', io);
app.use('/uploads', express.static('uploads')); // เสิร์ฟโฟลเดอร์รูปภาพ


// ส่วนการเชื่อมต่อ Socket.io
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // เข้าร่วมห้องแชทส่วนตัวระหว่างหมอและคนไข้ หรือผู้ใช้และแอดมิน
    socket.on('join-chat', ({ room }) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);
    });

    // ส่งข้อความส่วนตัวไปยังห้องแชท
    socket.on('send-message', async ({ room, message, sender }) => {
        try {
            const pool = await poolPromise;
            const timestamp = new Date();

            // บันทึกข้อความลงฐานข้อมูล
            await pool.request()
                .input('room', sql.NVarChar, room)
                .input('sender', sql.NVarChar, sender)
                .input('message', sql.NVarChar, message)
                .input('timestamp', sql.DateTime, timestamp)
                .query('INSERT INTO Messages (Room, Sender, Message, Timestamp) VALUES (@room, @sender, @message, @timestamp)');

            // กระจายข้อความให้คนอื่นในห้องแชทนั้นๆ
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

// นำเข้าเส้นทาง API ต่างๆ
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import superadminRoutes from './routes/superadmin.js';
import appointmentRoutes from './routes/appointments.js';
import chatRoutes from './routes/chat.js';
import notificationRoutes from './routes/notifications.js';
import profileRoutes from './routes/profile.js';


// ใช้งานเส้นทาง API ต่างๆ
app.use('/api', authRoutes);
app.use('/api', adminRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/notifications', (req, res, next) => { console.log('notif hit'); next(); }); // Debug
app.use('/api', appointmentRoutes);
app.use('/api', chatRoutes);
app.use('/api', notificationRoutes);
app.use('/api', profileRoutes); // ใช้งานเส้นทางโปรไฟล์


// ระบบส่งการแจ้งเตือนนัดหมาย (รันทุกๆ 1 ชั่วโมง)
const checkReminders = async () => {
    try {
        const pool = await poolPromise;
        // ค้นหารายการนัดหมายที่มีกำหนดในอีก 3 วัน หรือ 1 วันข้างหน้า
        const result = await pool.request().query(`
            SELECT a.*, d.FullName, a.AppointDate as AvailableDate
            FROM Appointments a
            JOIN Doctors d ON a.DoctorId = d.Id
            WHERE a.AppointDate IN (
                CONVERT(date, DATEADD(day, 3, GETDATE())),
                CONVERT(date, DATEADD(day, 1, GETDATE()))
            )
        `);

        for (const appt of result.recordset) {
            const daysLeft = Math.ceil((new Date(appt.AvailableDate) - new Date()) / (1000 * 60 * 60 * 24));

            const msg = `เตือนนัดหมาย: อีก ${daysLeft} วัน คุณมีนัดกับ ${appt.FullName}`;

            // ตรวจสอบว่าวันนี้ส่งการแจ้งเตือนเดิมไปรึยัง เพื่อป้องกันการส่งซ้ำซ้อนในวันเดียวกัน
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

setInterval(checkReminders, 1000 * 60 * 60); // รันทุกๆ 1 ชั่วโมง
checkReminders(); // รันทันทีหนึ่งครั้งเมื่อเริ่มเซิร์ฟเวอร์

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
