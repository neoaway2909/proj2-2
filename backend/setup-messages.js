import { poolPromise, sql } from './db.js';

async function setupMessagesTable() {
    try {
        const pool = await poolPromise;
        console.log('Connected to SQL Server, creating Messages table...');

        await pool.request().query(`
            IF OBJECT_ID('Messages', 'U') IS NOT NULL 
                DROP TABLE Messages;

            CREATE TABLE Messages (
                Id INT PRIMARY KEY IDENTITY(1,1),
                Room NVARCHAR(100) NOT NULL,
                Sender NVARCHAR(50) NOT NULL,
                Message NVARCHAR(MAX) NOT NULL,
                Timestamp DATETIME DEFAULT GETDATE()
            );
        `);

        console.log('Messages table created successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error creating messages table:', err);
        process.exit(1);
    }
}

setupMessagesTable();
