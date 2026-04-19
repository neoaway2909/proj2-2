import express from 'express';
import { poolPromise, sql } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// เส้นทางสำหรับเพิ่มข้อมูลแพทย์ (เฉพาะ Admin เท่านั้น)
router.post('/add-doctor', authenticateToken, async (req, res) => {
    const { fullName, specialty, phoneNumber, hospital } = req.body;

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .input('fullName', sql.NVARCHAR, fullName)
            .input('specialty', sql.NVARCHAR, specialty)
            .input('phoneNumber', sql.NVARCHAR, phoneNumber)
            .input('hospital', sql.NVARCHAR, hospital)
            .query('INSERT INTO Doctors (FullName, Specialty, PhoneNumber, Hospital) VALUES (@fullName, @specialty, @phoneNumber, @hospital)');

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
// แก้ไขข้อมูลแพทย์
router.put('/update-doctor/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { fullName, specialty, phoneNumber, hospital } = req.body;

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('fullName', sql.NVARCHAR, fullName)
            .input('specialty', sql.NVARCHAR, specialty)
            .input('phoneNumber', sql.NVARCHAR, phoneNumber)
            .input('hospital', sql.NVARCHAR, hospital)
            .query('UPDATE Doctors SET FullName = @fullName, Specialty = @specialty, PhoneNumber = @phoneNumber, Hospital = @hospital WHERE Id = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        res.json({ message: 'Doctor updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ลบข้อมูลแพทย์
router.delete('/delete-doctor/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Doctors WHERE Id = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        res.json({ message: 'Doctor deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ดึงรายการนัดหมายทั้งหมด (เฉพาะ Admin)
router.get('/all-appointments', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT 
                    a.Id, 
                    a.AppointDate, 
                    a.AppointTime, 
                    a.Status, 
                    a.CreatedAt,
                    u.FullName as CustomerName,
                    u.Email as CustomerEmail,
                    u.PhoneNumber as CustomerPhone,
                    d.FullName as DoctorName,
                    d.Specialty as DoctorSpecialty
                FROM Appointments a
                JOIN Users u ON a.UserId = u.Id
                JOIN Doctors d ON a.DoctorId = d.Id
                ORDER BY a.AppointDate DESC, a.AppointTime DESC
            `);

        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
