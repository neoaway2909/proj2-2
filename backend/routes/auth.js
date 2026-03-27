import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { poolPromise, sql } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET; // ดึงกุญแจลับสำหรับเข้ารหัส/ถอดรหัส Token จากไฟล์ .env

// =======================================================
// 1. เส้นทาง [สมัครสมาชิก] สำหรับผู้ใช้งานใหม่ (POST /register)
// =======================================================
router.post('/register', async (req, res) => {
    // 1. รับค่า Username และ Password ที่ผู้ใช้กรอกผ่านหน้าเว็บ (Body)
    const { username, password } = req.body;
    
    // 2. บังคับยัดตำแหน่ง (Role) ให้เป็น 'user' อัตโนมัติ เพื่อป้องกันการแอบสมัครเป็น admin
    const role = 'user'; 

    try {
        const pool = await poolPromise; // เชื่อมต่อฐานข้อมูล (SQL Server)
        
        // 3. ปั่นรหัสผ่าน (Hashing): เอารหัสผ่านที่ผู้ใช้กรอก มาเข้ารหัสด้วย bcrypt 10 รอบ เพื่อความปลอดภัย
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. บันทึกข้อมูลลงฐานข้อมูลผ่านคำสั่ง INSERT SQL
        await pool.request()
            .input('username', sql.NVARCHAR, username)
            .input('password', sql.NVARCHAR, hashedPassword) // เก็บเฉพาะรหัสที่ถูก Hash แล้วเท่านั้น
            .input('role', sql.NVARCHAR, role)
            .query('INSERT INTO Users (Username, Password, Role) VALUES (@username, @password, @role)');

        // 5. ส่งผลลัพธ์กลับไปที่หน้าเว็บว่าสมัครสำเร็จ (Status 201 Created)
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        // หากมีปัญหา (เช่น ชื่อ Username ซ้ำกับคนอื่น) จะหลุดเข้า catch และตอบกลับด้วย 500
        res.status(500).json({ message: err.message });
    }
});

// =======================================================
// 2. เส้นทาง [เข้าสู่ระบบ] เพื่อตรวจสอบและแจก Token (POST /login)
// =======================================================
router.post('/login', async (req, res) => {
    const { username, password } = req.body; // รับค่า username กับ password จากหน้าเว็บเหมือนเดิม

    try {
        const pool = await poolPromise;
        
        // 1. ค้นหาชื่อ Username คนนี้จากตาราง Users ใน ฐานข้อมูล (SELECT)
        const result = await pool.request()
            .input('username', sql.NVARCHAR, username)
            .query('SELECT * FROM Users WHERE Username = @username');

        // เก็บข้อมูลประวัติของผู้ใช้นั้นให้อยู่ในตัวแปร user
        const user = result.recordset[0];

        // 2. ตรวจสอบเงื่อนไขการล็อกอิน:
        //    - ถ้าไม่มีตัวแปร user (แปลว่าไม่มีชื่อคนนี้ในระบบ)
        //    - หรือ รหัสผ่านที่ส่งมาไม่ตรงกับรหัสผ่านดิบในระบบ (bcrypt.compare)
        if (!user || !(await bcrypt.compare(password, user.Password))) {
            return res.status(401).json({ message: 'Invalid credentials' }); // ตอบกลับว่ากรอกผิด (401 Unauthorized)
        }

        // 3. หากรหัสผ่านถูกต้อง ระบบจะสร้าง "บัตรผ่าน" หรือ JWT Token
        //    โดยฝังข้อมูล ไอดี, ชื่อ และ ตำแหน่งของเขา ใส่กระเป๋าให้ด้วย
        const token = jwt.sign(
            { id: user.Id, username: user.Username, role: user.Role },
            JWT_SECRET,          // ใช้กุญแจลับในการประทับตรา
            { expiresIn: '1h' }  // ให้ Token นี้มีอายุการใช้งาน 1 ชั่วโมง
        );

        // 4. ส่งผลลัพธ์กลับบ้าน ใหหน้าเว็บเอา Token ไปใช้งานต่อ
        res.json({ token, role: user.Role, username: user.Username });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// =======================================================
// 3. เส้นทาง [ตรวจข้อมูลฉัน] สำหรับทดสอบ Token (GET /me)
// =======================================================
// สังเกตว่าในวงเล็บมีคำว่า `authenticateToken` แทรกอยู่ แปลว่า "ก่อนจะรันโค้ดต่อได้ ต้องวิ่งไปตรวจ Token ในด่านหน้าให้ผ่านก่อน"
router.get('/me', authenticateToken, (req, res) => {
    // ถ้าฝ่าด่านหน้าที่มีการตรวจสอบ Token มาได้ ด่านหน้ามันจะฝากข้อมูลใส่ req.user ให้เราเอง 
    // เราเลยสามารถเอาส่งกลับไปโชว์ที่หน้าเว็บได้เลย
    res.json(req.user);
});

export default router;
