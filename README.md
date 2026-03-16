# Medical Appointment & Real-time Support System 🏥✨

ระบบนัดหมายแพทย์ออนไลน์พร้อมระบบสนทนาแบบเรียลไทม์ และระบบแจ้งเตือนอัตโนมัติ พัฒนาด้วยเทคโนโลยีสมัยใหม่ (React + Node.js + SQL Server)

## 🌟 ฟีเจอร์หลัก (Features)
- **📅 ระบบจองคัดหมาย:** เลือกแพทย์และวันเวลาได้แบบเรียลไทม์ ตัวเลือกเวลาจะอัปเดตทันทีเมื่อมีการจอง
- **💬 ระบบแชทเรียลไทม์:** ติดต่อสอบถามแอดมินได้โดยตรงผ่าน Socket.io พร้อมระบบเก็บประวัติการสนทนาลงฐานข้อมูล
- **🔔 ระบบแจ้งเตือน (Notifications):** 
    - แจ้งเตือนทันทีเมื่อจองสำเร็จ
    - แจ้งเตือนล่วงหน้า 3 วัน และ 1 วันก่อนถึงวันนัดหมายอัตโนมัติ
- **👨‍⚕️ ระบบจัดการสำหรับแอดมิน:** 
    - เพิ่มข้อมูลแพทย์และสาขาความเชี่ยวชาญ
    - จัดการตารางเวลา "ไม่ว่าง" ของแพทย์
    - ตอบแชทลูกค้าแบบแยกรายคน
- **🔐 ระบบสมาชิก:** แบ่งระดับการเข้าถึง (User, Admin, SuperAdmin, Doctor)
- **🎨 ดีไซน์ทันสมัย:** UI/UX สวยงาม ใช้งานง่าย และรองรับการแสดงผลบน IP Address สำหรับใช้งานในวง LAN

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend:** React, Vite, Lucide React (Icons), Axios, Socket.io-client
- **Backend:** Node.js, Express, Socket.io
- **Database:** Microsoft SQL Server (MSSQL)
- **Authentication:** JSON Web Token (JWT), BcryptJS

## 🚀 วิธีการติดตั้ง (Initial Setup)

### 1. ตั้งค่าฐานข้อมูล (Database)
1. รันสคริปต์ในไฟล์ `backend/schema.sql` บน SQL Server ของคุณ
2. รันคำสั่ง setup เพื่อเตรียมข้อมูลเริ่มต้น:
   ```bash
   cd backend
   node setup-db.js
   node setup-messages.js
   node setup-notifications.js
   ```

### 2. ตั้งค่า Backend
1. ติดตั้ง Dependencies:
   ```bash
   cd backend
   npm install
   ```
2. แก้ไขไฟล์ `.env` ในโฟลเดอร์ `backend` ให้ตรงกับ SQL Server ของคุณ:
   ```env
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_SERVER=localhost
   DB_DATABASE=proj2_2
   JWT_SECRET=your_secret_key
   PORT=5001
   ```
3. เริ่มทำงาน:
   ```bash
   npm start
   ```

### 3. ตั้งค่า Frontend
1. ติดตั้ง Dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. เริ่มทำงาน:
   ```bash
   npm run dev
   ```

## 📱 การใช้งานผ่าน IP Address (Network)
หากต้องการให้เครื่องอื่นในเครือข่ายเข้าใช้งานได้:
1. ตรวจสอบ IP เครื่องโฮสต์ (ตัวอย่าง: `192.168.1.150`)
2. เข้าใช้งานผ่าน `http://192.168.1.150:5173`

---
พัฒนาโดย **Antigravity AI Assistant** มาร่วมสร้างประสบการณ์ดูแลสุขภาพที่ดียิ่งขึ้นไปด้วยกันครับ! 😊🚀
