import express from 'express';
import bcrypt from 'bcryptjs';
import { poolPromise, sql } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// เส้นทางสำหรับสร้างบัญชีเจ้าหน้าที่ (เฉพาะ SuperAdmin เท่านั้น)
router.post('/create-staff', authenticateToken, async (req, res) => {
    const { username, password, role } = req.body;

    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Superadmin access required' });
    }
    if (role !== 'admin') {
        return res.status(400).json({ message: 'Superadmin can only create admin staff' });
    }

    try {
        const pool = await poolPromise;
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.request()
            .input('username', sql.NVARCHAR, username)
            .input('password', sql.NVARCHAR, hashedPassword)
            .input('role', sql.NVARCHAR, role)
            .query('INSERT INTO Users (Username, Password, Role) VALUES (@username, @password, @role)');

        res.status(201).json({ message: `Admin account created successfully` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ดึงจำนวนแอดมินทั้งหมดในระบบ
router.get('/admin-count', authenticateToken, async (req, res) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Superadmin access required' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query("SELECT COUNT(*) as count FROM Users WHERE Role = 'admin'");

        res.json({ count: result.recordset[0].count });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ดึงรายชื่อแอดมินทั้งหมดในระบบ (ยกเว้นรหัสผ่าน)
router.get('/admins', authenticateToken, async (req, res) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ message: 'Superadmin access required' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query("SELECT Id, Username, Role FROM Users WHERE Role = 'admin' ORDER BY Id DESC");

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
