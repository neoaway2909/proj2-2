import { poolPromise } from './db.js';

async function setupAppointmentTables() {
    try {
        const pool = await poolPromise;
        await pool.request().query(`
            IF OBJECT_ID('DoctorSchedules', 'U') IS NULL
            BEGIN
                CREATE TABLE DoctorSchedules (
                    Id INT PRIMARY KEY IDENTITY(1,1),
                    DoctorId INT NOT NULL FOREIGN KEY REFERENCES Doctors(Id),
                    AvailableDate DATE NOT NULL,
                    StartTime TIME NOT NULL,
                    EndTime TIME NOT NULL,
                    IsBooked BIT DEFAULT 0
                );
            END

            IF OBJECT_ID('Appointments', 'U') IS NULL
            BEGIN
                CREATE TABLE Appointments (
                    Id INT PRIMARY KEY IDENTITY(1,1),
                    UserId INT NOT NULL FOREIGN KEY REFERENCES Users(Id),
                    ScheduleId INT NOT NULL FOREIGN KEY REFERENCES DoctorSchedules(Id),
                    Status NVARCHAR(20) DEFAULT 'Booked'
                );
            END
        `);
        console.log("Appointment tables created successfully.");
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
setupAppointmentTables();
