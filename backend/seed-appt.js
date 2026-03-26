import { poolPromise, sql } from './db.js';

async function seed() {
    try {
        const pool = await poolPromise;
        const d = new Date();
        d.setDate(d.getDate() + 2); // 2 days from now
        const dateStr = d.toISOString().split('T')[0];
        
        await pool.request()
            .input('userId', sql.INT, 3) // neooo
            .input('doctorId', sql.INT, 1) // doctor
            .input('date', sql.DATE, dateStr)
            .input('time', sql.VarChar, '09:00')
            .query('INSERT INTO Appointments (UserId, DoctorId, AppointDate, AppointTime) VALUES (@userId, @doctorId, @date, @time)');
        console.log('Inserted appointment for UserId 3');
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
seed();
