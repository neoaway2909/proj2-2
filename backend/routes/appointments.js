import express from 'express';
import { poolPromise, sql } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

const STANDARD_SLOTS = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"];

// ดึงช่วงเวลาที่ว่างสำหรับหมอคนนั้นๆ และวันที่ระบุ
router.get('/doctor-slots', async (req, res) => {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) return res.status(400).json({ message: "Missing params" });

    try {
        const pool = await poolPromise;

        // 1. ดึงช่วงเวลาที่แอดมินบล็อกไว้ (ไม่ว่าง)
        const blockedRes = await pool.request()
            .input('doctorId', sql.INT, doctorId)
            .input('date', sql.DATE, date)
            .query('SELECT StartTime, EndTime FROM DoctorUnavailable WHERE DoctorId = @doctorId AND UnavailableDate = @date');

        // 2. ดึงรายการนัดหมายที่มีการจองไว้แล้ว
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
            // ตรวจสอบว่าถูกจองไปแล้วหรือยัง
            if (appts.includes(timeStr)) return { time: timeStr, status: 'booked' };

            // ตรวจสอบว่าแอดมินบล็อกไว้หรือไม่
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

// แอดมินเพิ่มช่วงเวลาที่ไม่ว่างของหมอ
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

// ผู้ใช้ทำการจองช่วงเวลา
router.post('/book', authenticateToken, async (req, res) => {
    const { doctorId, date, time } = req.body;
    const userId = req.user.id;

    try {
        const pool = await poolPromise;
        // ตรวจสอบว่ามีคนจองไปก่อนหน้านี้หรือยังจากฐานข้อมูล (Double check)
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

        // ดึงชื่อหมอเพื่อนำไปใช้ในข้อความแจ้งเตือน
        const docRes = await pool.request().input('did', sql.INT, doctorId).query('SELECT FullName FROM Doctors WHERE Id = @did');
        const docName = docRes.recordset[0]?.FullName || 'Doctor';

        // บันทึกการแจ้งเตือนลงฐานข้อมูลเพื่อให้ผู้ใช้เห็นภายหลัง
        const msg = `คุณจองสำเร็จ! นัดพบ ${docName} วันที่ ${new Date(date).toLocaleDateString()} เวลา ${time}`;
        await pool.request()
            .input('uid', sql.INT, userId)
            .input('msg', sql.NVarChar, msg)
            .query('INSERT INTO Notifications (UserId, Message) VALUES (@uid, @msg)');

        req.app.get('io').emit('scheduleUpdated');
        req.app.get('io').emit('notification', { userId }); // แจ้งให้ Frontend อัปเดตรายการแจ้งเตือนบนหน้าจอทันที
        res.json({ message: "Appointment booked successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ดึงข้อมูลรายชื่อหมอทั้งหมดในระบบ
router.get('/doctors', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT * FROM Doctors');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ดึงวันที่หมอไม่ว่างทั้งหมด (ส่งกลับไปให้แอดมินทำจุดบนปฏิทิน)
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

// ดึงรายการนัดหมายทั้งหมดของผู้ใช้ที่ล็อกอินอยู่
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
        console.error("GET /my-appointments error:", err);
        res.status(500).json({ message: err.message });
    }
});

export default router;
