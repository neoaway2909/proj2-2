import { poolPromise, sql } from './db.js';

async function checkData() {
    try {
        const pool = await poolPromise;
        const users = await pool.request().query('SELECT Id, Username, Role FROM Users');
        const appts = await pool.request().query('SELECT * FROM Appointments');
        console.log("Users:", JSON.stringify(users.recordset, null, 2));
        console.log("Appointments:", JSON.stringify(appts.recordset, null, 2));
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
