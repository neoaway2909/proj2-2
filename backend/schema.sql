IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'proj2_2')
BEGIN
    CREATE DATABASE proj2_2;
END
GO

USE proj2_2;
GO

IF OBJECT_ID('Users', 'U') IS NOT NULL 
    DROP TABLE Users;
GO

CREATE TABLE Users (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Password NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) NOT NULL CHECK (Role IN ('user', 'admin', 'superadmin', 'doctor'))
);
GO

-- เพิ่มผู้ใช้เริ่มต้น (รหัสผ่านสำหรับทุกคนคือ 'password123')
INSERT INTO Users (Username, Password, Role) VALUES 
('superadmin', '$2b$10$w3PGYPlGxWyQku14b45vwOlEYpbOw5qZPxZHBx/MkbwvxYs7Djk1q', 'superadmin'),
('admin', '$2b$10$w3PGYPlGxWyQku14b45vwOlEYpbOw5qZPxZHBx/MkbwvxYs7Djk1q', 'admin'),
('user', '$2b$10$w3PGYPlGxWyQku14b45vwOlEYpbOw5qZPxZHBx/MkbwvxYs7Djk1q', 'user');
GO

IF OBJECT_ID('Doctors', 'U') IS NOT NULL 
    DROP TABLE Doctors;
GO

CREATE TABLE Doctors (
    Id INT PRIMARY KEY IDENTITY(1,1),
    FullName NVARCHAR(100) NOT NULL,
    Specialty NVARCHAR(100) NOT NULL,
    PhoneNumber NVARCHAR(20) NOT NULL
);
GO

IF OBJECT_ID('DoctorSchedules', 'U') IS NOT NULL 
    DROP TABLE DoctorSchedules;
GO

CREATE TABLE DoctorSchedules (
    Id INT PRIMARY KEY IDENTITY(1,1),
    DoctorId INT NOT NULL FOREIGN KEY REFERENCES Doctors(Id),
    AvailableDate DATE NOT NULL,
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    IsBooked BIT DEFAULT 0
);
GO

IF OBJECT_ID('Appointments', 'U') IS NOT NULL 
    DROP TABLE Appointments;
GO

CREATE TABLE Appointments (
    Id INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL FOREIGN KEY REFERENCES Users(Id),
    ScheduleId INT NOT NULL FOREIGN KEY REFERENCES DoctorSchedules(Id),
    Status NVARCHAR(20) DEFAULT 'Booked'
);
GO
