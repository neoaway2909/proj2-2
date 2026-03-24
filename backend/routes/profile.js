import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { poolPromise, sql } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ตั้งค่า Multer สำหรับเก็บรูปภาพ
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// ดึงข้อมูลโปรไฟล์ของผู้ใช้คนปัจจุบัน
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query('SELECT Id, Username, FullName, Email, PhoneNumber, ProfilePic, Role FROM Users WHERE Id = @userId');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// อัปเดตข้อมูลโปรไฟล์ (รวมถึงรูปภาพ)
router.put('/profile', authenticateToken, upload.single('profilePic'), async (req, res) => {
    const { fullName, email, phoneNumber } = req.body;
    let profilePicUrl = null;

    if (req.file) {
        profilePicUrl = `/uploads/${req.file.filename}`;
    }

    try {
        const pool = await poolPromise;
        
        // ตรวจสอบข้อมูลปัจจุบันก่อน
        const currentData = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query('SELECT ProfilePic FROM Users WHERE Id = @userId');

        const finalProfilePic = profilePicUrl || currentData.recordset[0]?.ProfilePic;

        await pool.request()
            .input('userId', sql.Int, req.user.id)
            .input('fullName', sql.NVarChar, fullName)
            .input('email', sql.NVarChar, email)
            .input('phoneNumber', sql.NVarChar, phoneNumber)
            .input('profilePic', sql.NVarChar, finalProfilePic)
            .query(`
                UPDATE Users 
                SET FullName = @fullName, 
                    Email = @email, 
                    PhoneNumber = @phoneNumber, 
                    ProfilePic = @profilePic 
                WHERE Id = @userId
            `);

        res.json({ 
            message: 'Profile updated successfully',
            profilePic: finalProfilePic 
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
