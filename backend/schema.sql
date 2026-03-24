IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'proj2_2')
BEGIN
    CREATE DATABASE proj2_2;
END
GO

USE proj2_2;
GO

-- ลบตารางเดิมถ้ามีอยู่ (ลบตามลำดับ Foreign Key)
IF OBJECT_ID('Notifications', 'U') IS NOT NULL DROP TABLE Notifications;
IF OBJECT_ID('Messages', 'U') IS NOT NULL DROP TABLE Messages;
IF OBJECT_ID('Appointments', 'U') IS NOT NULL DROP TABLE Appointments;
IF OBJECT_ID('DoctorUnavailable', 'U') IS NOT NULL DROP TABLE DoctorUnavailable;
IF OBJECT_ID('DoctorSchedules', 'U') IS NOT NULL DROP TABLE DoctorSchedules;
IF OBJECT_ID('Doctors', 'U') IS NOT NULL DROP TABLE Doctors;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
GO

-- สร้างตาราง Users พร้อมฟิลด์สำหรับโปรไฟล์
CREATE TABLE Users (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Password NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(100),
    Email NVARCHAR(100),
    PhoneNumber NVARCHAR(20),
    ProfilePic NVARCHAR(255),
    Role NVARCHAR(20) NOT NULL CHECK (Role IN ('user', 'admin', 'superadmin', 'doctor'))
);
GO

-- เพิ่มผู้ใช้เริ่มต้น (รหัสผ่านคือ 'password123')
INSERT INTO Users (Username, Password, FullName, Role) VALUES 
('superadmin', '$2b$10$w3PGYPlGxWyQku14b45vwOlEYpbOw5qZPxZHBx/MkbwvxYs7Djk1q', 'Super Admin', 'superadmin'),
('admin', '$2b$10$w3PGYPlGxWyQku14b45vwOlEYpbOw5qZPxZHBx/MkbwvxYs7Djk1q', 'Main Admin', 'admin'),
('user', '$2b$10$w3PGYPlGxWyQku14b45vwOlEYpbOw5qZPxZHBx/MkbwvxYs7Djk1q', 'Test User', 'user');
GO

-- สร้างตาราง Doctors
CREATE TABLE Doctors (
    Id INT PRIMARY KEY IDENTITY(1,1),
    FullName NVARCHAR(100) NOT NULL,
    Specialty NVARCHAR(100) NOT NULL,
    PhoneNumber NVARCHAR(20) NOT NULL,
    Hospital NVARCHAR(100) DEFAULT 'Wattanapat Hospital'
);
GO

INSERT INTO Doctors (FullName, Specialty, PhoneNumber) VALUES
(N'doctor', N'หมอฟัน', '081-234-5678');
GO

-- ตารางสำหรับแอดมินบล็อกเวลา (Unavailable)
CREATE TABLE DoctorUnavailable (
    Id INT PRIMARY KEY IDENTITY(1,1),
    DoctorId INT NOT NULL FOREIGN KEY REFERENCES Doctors(Id),
    UnavailableDate DATE NOT NULL,
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL
);
GO

-- ตารางนัดหมาย (Dynamic Slots)
CREATE TABLE Appointments (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL FOREIGN KEY REFERENCES Users(Id),
    DoctorId INT NOT NULL FOREIGN KEY REFERENCES Doctors(Id),
    AppointDate DATE NOT NULL,
    AppointTime TIME NOT NULL,
    Status NVARCHAR(20) DEFAULT 'Booked',
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- ตารางข้อความแชท
CREATE TABLE Messages (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Room NVARCHAR(100) NOT NULL,
    Sender NVARCHAR(50) NOT NULL,
    Message NVARCHAR(MAX) NOT NULL,
    Timestamp DATETIME DEFAULT GETDATE()
);
GO

-- ตารางการแจ้งเตือน
CREATE TABLE Notifications (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL FOREIGN KEY REFERENCES Users(Id),
    Message NVARCHAR(MAX) NOT NULL,
    IsRead BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO
