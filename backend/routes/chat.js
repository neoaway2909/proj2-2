import express from 'express';
import { poolPromise, sql } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// ดึงประวัติการแชทรายห้อง (Room) จากฐานข้อมูล
router.get('/messages/:room', authenticateToken, async (req, res) => {
    const { room } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('room', sql.NVarChar, room)
            .query('SELECT * FROM Messages WHERE Room = @room ORDER BY Timestamp ASC');

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ดึงรายชื่อผู้ใช้ที่เคยแชทกับแอดมิน (ใช้แสดงรายชื่อในแถบด้านข้างของแอดมิน)
router.get('/chat-users', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query("SELECT DISTINCT REPLACE(Room, 'room_admin_', '') as username FROM Messages WHERE Room LIKE 'room_admin_%'");

        const users = result.recordset.map(r => r.username).filter(u => u !== 'admin');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
