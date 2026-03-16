import express from 'express';
import { poolPromise, sql } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

const STANDARD_SLOTS = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"];

// Get slots for a specific doctor and date
router.get('/doctor-slots', async (req, res) => {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) return res.status(400).json({ message: "Missing params" });

    try {
        const pool = await poolPromise;

        // 1. Get blocked times by admin
        const blockedRes = await pool.request()
            .input('doctorId', sql.INT, doctorId)
            .input('date', sql.DATE, date)
            .query('SELECT StartTime, EndTime FROM DoctorUnavailable WHERE DoctorId = @doctorId AND UnavailableDate = @date');

        // 2. Get existing appointments
        const apptRes = await pool.request()
            .input('doctorId', sql.INT, doctorId)
            .input('date', sql.DATE, date)
            .query('SELECT AppointTime FROM Appointments WHERE DoctorId = @doctorId AND AppointDate = @date');

        const blocked = blockedRes.recordset;
        const appts = apptRes.recordset.map(a => {
            const t = new Date(a.AppointTime);
            return t.toISOString().substring(11, 16);
        });

        const slots = STANDARD_SLOTS.map(timeStr => {
            // Check if booked
            if (appts.includes(timeStr)) return { time: timeStr, status: 'booked' };

            // Check if admin blocked
            // timeStr "09:00" vs stored TIME
            const isBlocked = blocked.some(b => {
                const start = new Date(b.StartTime).toISOString().substring(11, 16);
                const end = new Date(b.EndTime).toISOString().substring(11, 16);
                return timeStr >= start && timeStr < end;
            });

            if (isBlocked) return { time: timeStr, status: 'unavailable' };

            return { time: timeStr, status: 'available' };
        });

        res.json(slots);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin adds unavailable time
router.post('/unavailable', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin only" });
    const { doctorId, date, startTime, endTime } = req.body;

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('doctorId', sql.INT, doctorId)
            .input('date', sql.DATE, date)
            .input('startTime', sql.VarChar, startTime)
            .input('endTime', sql.VarChar, endTime)
            .query('INSERT INTO DoctorUnavailable (DoctorId, UnavailableDate, StartTime, EndTime) VALUES (@doctorId, @date, @startTime, @endTime)');

        req.app.get('io').emit('scheduleUpdated');
        res.status(201).json({ message: "Unavailable time saved" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// User books a slot
router.post('/book', authenticateToken, async (req, res) => {
    const { doctorId, date, time } = req.body;
    const userId = req.user.id;

    try {
        const pool = await poolPromise;
        // Check if already taken
        const check = await pool.request()
            .input('doctorId', sql.INT, doctorId)
            .input('date', sql.DATE, date)
            .input('time', sql.VarChar, time)
            .query('SELECT Id FROM Appointments WHERE DoctorId = @doctorId AND AppointDate = @date AND AppointTime = @time');

        if (check.recordset.length > 0) return res.status(400).json({ message: "Slot already booked" });

        await pool.request()
            .input('userId', sql.INT, userId)
            .input('doctorId', sql.INT, doctorId)
            .input('date', sql.DATE, date)
            .input('time', sql.VarChar, time)
            .query('INSERT INTO Appointments (UserId, DoctorId, AppointDate, AppointTime) VALUES (@userId, @doctorId, @date, @time)');

        // Get Doctor name for notification
        const docRes = await pool.request().input('did', sql.INT, doctorId).query('SELECT FullName FROM Doctors WHERE Id = @did');
        const docName = docRes.recordset[0]?.FullName || 'Doctor';

        // Add Notification
        const msg = `คุณจองสำเร็จ! นัดพบ ${docName} วันที่ ${new Date(date).toLocaleDateString()} เวลา ${time}`;
        await pool.request()
            .input('uid', sql.INT, userId)
            .input('msg', sql.NVarChar, msg)
            .query('INSERT INTO Notifications (UserId, Message) VALUES (@uid, @msg)');

        req.app.get('io').emit('scheduleUpdated');
        req.app.get('io').emit('notification', { userId }); // Notify frontend to refresh notifications
        res.json({ message: "Appointment booked successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all doctors
router.get('/doctors', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Doctors');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Helper for Admin dots
router.get('/blocked-dates', async (req, res) => {
    const { doctorId } = req.query;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('doctorId', sql.INT, doctorId)
            .query('SELECT DISTINCT UnavailableDate FROM DoctorUnavailable WHERE DoctorId = @doctorId');
        res.json(result.recordset.map(r => r.UnavailableDate));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get user appointments
router.get('/my-appointments', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.INT, userId)
            .query(`
                SELECT a.*, d.FullName, d.Specialty 
                FROM Appointments a
                JOIN Doctors d ON a.DoctorId = d.Id
                WHERE a.UserId = @userId
                ORDER BY a.AppointDate ASC, a.AppointTime ASC
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
