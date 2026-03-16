import { poolPromise, sql } from './db.js';

async function setupNotificationsTable() {
    try {
        const pool = await poolPromise;
        console.log('Connected to SQL Server, creating Notifications table...');

        await pool.request().query(`
            IF OBJECT_ID('Notifications', 'U') IS NOT NULL 
                DROP TABLE Notifications;

            CREATE TABLE Notifications (
                Id INT PRIMARY KEY IDENTITY(1,1),
                UserId INT NOT NULL FOREIGN KEY REFERENCES Users(Id),
                Message NVARCHAR(MAX) NOT NULL,
                IsRead BIT DEFAULT 0,
                CreatedAt DATETIME DEFAULT GETDATE()
            );
        `);

        console.log('Notifications table created successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error creating notifications table:', err);
        process.exit(1);
    }
}

setupNotificationsTable();
