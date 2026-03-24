import fs from 'fs';
import sql from 'mssql';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: 'master', // เชื่อมต่อไปที่ master ก่อนเพื่อสร้างฐานข้อมูลใหม่
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function setupDatabase() {
    try {
        console.log('Connecting to master. Configuration:', { ...config, password: '***' });
        const pool = await new sql.ConnectionPool(config).connect();
        console.log('Connected to master. Running schema.sql...');

        const schemaPath = path.join(__dirname, 'schema.sql');
        let sqlContent = fs.readFileSync(schemaPath, 'utf8');

        // แยกคำสั่งด้วย GO เพื่อรันแยกกัน เนื่องจาก mssql driver ไม่รองรับ GO โดยตรง
        const statements = sqlContent.split(/GO\b/i).map(s => s.trim()).filter(stmt => stmt !== '');

        for (const statement of statements) {
            try {
                await pool.request().query(statement);
                console.log('Executed block successfully:\n' + statement.substring(0, 50) + '...');
            } catch (err) {
                console.error('Error executing block:', statement.substring(0, 50) + '...', err.message);
            }
        }

        console.log('Database setup complete!');
        process.exit(0);
    } catch (err) {
        console.error('Error setting up DB:', err);
        process.exit(1);
    }
}

setupDatabase();

