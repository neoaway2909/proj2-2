import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware: ตัวกลาง (ทำหน้าที่เหมือน รปภ. ตรวจบัตรก่อนเข้าตึก)
export const authenticateToken = (req, res, next) => {
    // 1. ตรวจสอบว่าในส่วนหัวของจดหมาย (Headers) มีแนบบัตรผ่าน (Authorization) มาด้วยไหม
    const authHeader = req.headers['authorization'];
    
    // ปกติบัตรผ่านจะมาในรูปแบบ "Bearer <ตัวอักษรTokenยาวๆ>" จึงต้องเอามาตัดช่องว่างเพื่อเอาแค่ Token ดิบๆ
    const token = authHeader && authHeader.split(' ')[1];

    // 2. ถ้าไม่ได้แนบ Token มาเลย (ลืมล็อกอิน) รปภ. จะไล่กลับไป (Status 401 โดนปฏิเสธการเข้าถึง)
    if (!token) return res.status(401).json({ message: 'No token provided' });

    // 3. ถ้ามีบัตร รปภ. จะเอาไปสแกนไฟฉายด้วยเครื่องตรวจสอบของบริษัท (jwt.verify จับคู่กับกุญแจลับ JWT_SECRET)
    jwt.verify(token, JWT_SECRET, (err, user) => {
        // หากบัตรปลอม หรือบัตรหมดอายุแล้ว รปภ. จะยึดบัตรและให้กลับไปล็อกอินใหม่ (Status 403 ของหมดอายุ)
        if (err) return res.status(403).json({ message: 'Token is invalid' });
        
        // 4. ถ้าสแกนผ่าน รปภ. จะควักเอาข้อมูลส่วนตัวที่ซ่อนอยู่ในตั๋ว (เช่น ชื่อ, ID, ตำแหน่ง)
        // เอาแปะป้ายชื่อคล้องคอไว้ให้คุณด้วยคำสั่ง `req.user = user;`
        req.user = user;
        
        // 5. เปิดประตูให้คุณเดินเข้าไปทำเรื่องต่อในบริษัทได้ (next(); คือการสั่งรันโค้ดต่อจากนี้)
        next();
    });
};
