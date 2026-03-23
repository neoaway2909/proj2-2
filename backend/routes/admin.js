import express from 'express';
import { poolPromise, sql } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// เส้นทางสำหรับเพิ่มข้อมูลแพทย์ (เฉพาะ Admin เท่านั้น)
router.post('/add-doctor', authenticateToken, async (req, res) => {
    const { fullName, specialty, phoneNumber } = req.body;

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('fullName', sql.NVARCHAR, fullName)
            .input('specialty', sql.NVARCHAR, specialty)
            .input('phoneNumber', sql.NVARCHAR, phoneNumber)
            .query('INSERT INTO Doctors (FullName, Specialty, PhoneNumber) VALUES (@fullName, @specialty, @phoneNumber)');

        res.status(201).json({ message: 'Doctor details added successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ตัวอย่างเส้นทางที่เข้าถึงได้เฉพาะ Admin เท่านั้น
router.get('/admin-only', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    res.json({ message: 'Welcome to Admin Dashboard' });
});

export default router;
