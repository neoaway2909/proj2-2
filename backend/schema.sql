-- ==========================================================
-- สคริปต์สร้างฐานข้อมูลและตารางสำหรับระบบ CareOnline
-- ==========================================================

-- ส่วนที่ 1: ตรวจสอบว่ามีฐานข้อมูลชื่อ proj2_2 หรือยัง ถ้ายังให้สร้างใหม่
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'proj2_2')
BEGIN
    CREATE DATABASE proj2_2;
END
GO

USE proj2_2;
GO

-- ==========================================================
-- ส่วนที่ 2: เคลียร์ตารางเก่าทิ้ง (เผื่อกรณีต้องการรีเซ็ตระบบใหม่)
-- ลยตามลำดับจากตารางลูก (Foreign Key) ไปหาตารางแม่ เพื่อไม่ให้เกิด Error
-- ==========================================================
IF OBJECT_ID('Notifications', 'U') IS NOT NULL DROP TABLE Notifications;
IF OBJECT_ID('Messages', 'U') IS NOT NULL DROP TABLE Messages;
IF OBJECT_ID('Appointments', 'U') IS NOT NULL DROP TABLE Appointments;
IF OBJECT_ID('DoctorUnavailable', 'U') IS NOT NULL DROP TABLE DoctorUnavailable;
IF OBJECT_ID('DoctorSchedules', 'U') IS NOT NULL DROP TABLE DoctorSchedules;
IF OBJECT_ID('Doctors', 'U') IS NOT NULL DROP TABLE Doctors;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
GO

-- ==========================================================
-- ตารางที่ 1: Users (เก็บข้อมูลบัญชีผู้ใช้งานทั้งหมดในระบบ)
-- หน้าที่: เก็บไอดี, รหัสผ่าน, ข้อมูลติดต่อ, รูปโปรไฟล์ และ "ตำแหน่ง (Role)" ว่าเป็นใคร
-- ==========================================================
CREATE TABLE Users (
    Id INT PRIMARY KEY IDENTITY(1,1), -- รหัสพนักงาน/ผู้ใช้ รันเลขอัตโนมัติ (1, 2, 3...)
    Username NVARCHAR(50) NOT NULL UNIQUE, -- ชื่อผู้ใช้สำหรับล็อกอิน (ห้ามซ้ำ)
    Password NVARCHAR(255) NOT NULL, -- รหัสผ่านที่เข้ารหัสแล้ว (Hashed Password)
    FullName NVARCHAR(100), -- ชื่อ-นามสกุลจริง
    Email NVARCHAR(100), -- อีเมลติดต่อ
    PhoneNumber NVARCHAR(20), -- เบอร์โทรศัพท์
    ProfilePic NVARCHAR(255), -- พาร์ทเก็บรูปภาพ เช่น /uploads/123.png
    Role NVARCHAR(20) NOT NULL CHECK (Role IN ('user', 'admin', 'superadmin', 'doctor')) -- ตำแหน่งสิทธิ์การใช้งาน
);
GO

-- สร้างไอดีบอทจำลอง 3 ตัวอักษรให้ระบบพร้อมใช้งาน (รหัสผ่านคือ 'password123' ทั้งหมดที่เข้ารหัสไว้)
INSERT INTO Users (Username, Password, FullName, Role) VALUES 
('superadmin', '$2b$10$w3PGYPlGxWyQku14b45vwOlEYpbOw5qZPxZHBx/MkbwvxYs7Djk1q', 'Super Admin', 'superadmin'),
('admin', '$2b$10$w3PGYPlGxWyQku14b45vwOlEYpbOw5qZPxZHBx/MkbwvxYs7Djk1q', 'Main Admin', 'admin'),
('user', '$2b$10$w3PGYPlGxWyQku14b45vwOlEYpbOw5qZPxZHBx/MkbwvxYs7Djk1q', 'Test User', 'user');
GO

-- ==========================================================
-- ตารางที่ 2: Doctors (เก็บข้อมูลประวัติแพทย์)
-- หน้าที่: เป็นตารางแคตตาล็อกคุณหมอ จะถูกดึงไปโชว์ในหน้าจอคนไข้ตอนเลือกหมอ
-- ==========================================================
CREATE TABLE Doctors (
    Id INT PRIMARY KEY IDENTITY(1,1), -- รหัสจำเพาะของคุณหมอ
    FullName NVARCHAR(100) NOT NULL, -- ชื่อจริงหมอ
    Specialty NVARCHAR(100) NOT NULL, -- ความเชี่ยวชาญ (เช่น หมอฟัน, ตา, กระดูก)
    PhoneNumber NVARCHAR(20) NOT NULL, -- เบอร์ติดต่อหมอ
    Hospital NVARCHAR(100) DEFAULT 'Wattanapat Hospital' -- โรงพยาบาลต้นสังกัด
);
GO

INSERT INTO Doctors (FullName, Specialty, PhoneNumber) VALUES
(N'doctor', N'หมอฟัน', '081-234-5678');
GO

-- ==========================================================
-- ตารางที่ 3: DoctorUnavailable (เก็บข้อมูลเวลาที่หมอ "ไม่ว่าง")
-- หน้าที่: ให้แอดมินแทรกคิว블็อกเวลา เช่น หมอลาพักร้อน หรือติดผ่าตัดด่วน
-- การเชื่อมโยง: อ้างอิง ID ของหมอ (DoctorId) มาจากตาราง Doctors
-- ==========================================================
CREATE TABLE DoctorUnavailable (
    Id INT PRIMARY KEY IDENTITY(1,1),
    DoctorId INT NOT NULL FOREIGN KEY REFERENCES Doctors(Id), -- ผูกกับตัวหมอ
    UnavailableDate DATE NOT NULL, -- วันที่หมอไม่ว่าง
    StartTime TIME NOT NULL, -- เวลาเริ่มต้นที่บล็อก
    EndTime TIME NOT NULL -- เวลาสิ้นสุดที่บล็อก
);
GO

-- ==========================================================
-- ตารางที่ 4: Appointments (เก็บประวัติการจองคิว "นัดหมาย")
-- หน้าที่: บันทึกว่า "ใคร (UserId)" จองคิว "หมอคนไหน (DoctorId)" เมื่อไหร่
-- ==========================================================
CREATE TABLE Appointments (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL FOREIGN KEY REFERENCES Users(Id), -- อ้างอิงคนไข้ที่กดยืนยัน
    DoctorId INT NOT NULL FOREIGN KEY REFERENCES Doctors(Id), -- อ้างอิงคุณหมอที่ให้บริการ
    AppointDate DATE NOT NULL, -- วันที่นัด
    AppointTime TIME NOT NULL, -- ะเวลานัด
    Status NVARCHAR(20) DEFAULT 'Booked', -- สถานะบัตรคิว (เช่น จองแล้ว, ยกเลิกแล้ว)
    CreatedAt DATETIME DEFAULT GETDATE() -- วันเวลาที่คุณประทับตราจองคิว
);
GO

-- ==========================================================
-- ตารางที่ 5: Messages (เก็บประวัติการสนทนา "แชท")
-- หน้าที่: คอยอัดเสียงบันทึกข้อความทุกอย่างที่คุยกัน เพื่อไม่ให้แชทหายเมื่อรีเฟรชหน้าเว็บ
-- ==========================================================
CREATE TABLE Messages (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Room NVARCHAR(100) NOT NULL, -- ชื่อห้องแชท (เช่น room_admin_neo)
    Sender NVARCHAR(50) NOT NULL, -- ชื่อคนส่งข้อความ หรือ admin
    Message NVARCHAR(MAX) NOT NULL, -- ตัวอักษรเนื้อหาแชททั้งหมด
    Timestamp DATETIME DEFAULT GETDATE() -- เวลาที่กดส่งข้อความ (เอาไปโชว์คคิวเรียงบน-ล่าง)
);
GO

-- ==========================================================
-- ตารางที่ 6: Notifications (เก็บรายการส่งกล่องข้อความ "แจ้งเตือน")
-- หน้าที่: ทำหน้าที่เหมือนกล่องจดหมายแจ้งข่าวสารจากระบบไปถึงผู้ใช้งานโดยตรง
-- ==========================================================
CREATE TABLE Notifications (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL FOREIGN KEY REFERENCES Users(Id), -- อ้างอิงว่าจะส่งกระดิ่งไปเตือนใคร
    Message NVARCHAR(MAX) NOT NULL, -- เนื้อหาการแจ้งเตือน (เช่น "พรุ่งนี้คุณมีนัดน้า~")
    IsRead BIT DEFAULT 0, -- สถานะการอ่าน (0 = ยังไม่อ่าน จะโชว์จุดแดง, 1 = อ่านเบลียร์แล้ว)
    CreatedAt DATETIME DEFAULT GETDATE() -- เวลาที่ระบบส่งใบแจ้งเตือน
);
GO
