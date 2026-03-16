import { poolPromise } from './db.js';

async function migrate() {
    try {
        const pool = await poolPromise;
        // Drop old tables if they exist to keep it clean for the new logic
        await pool.request().query(`
            IF OBJECT_ID('Appointments', 'U') IS NOT NULL DROP TABLE Appointments;
            IF OBJECT_ID('DoctorSchedules', 'U') IS NOT NULL DROP TABLE DoctorSchedules;

            -- Table for Admin to block times
            CREATE TABLE DoctorUnavailable (
                Id INT PRIMARY KEY IDENTITY(1,1),
                DoctorId INT NOT NULL FOREIGN KEY REFERENCES Doctors(Id),
                UnavailableDate DATE NOT NULL,
                StartTime TIME NOT NULL,
                EndTime TIME NOT NULL
            );

            -- Table for actual bookings
            CREATE TABLE Appointments (
                Id INT PRIMARY KEY IDENTITY(1,1),
                UserId INT NOT NULL FOREIGN KEY REFERENCES Users(Id),
                DoctorId INT NOT NULL FOREIGN KEY REFERENCES Doctors(Id),
                AppointDate DATE NOT NULL,
                AppointTime TIME NOT NULL,
                Status NVARCHAR(20) DEFAULT 'Booked'
            );
        `);
        console.log("Database migrated to dynamic slots logic.");
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
migrate();
