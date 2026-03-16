const fs = require('fs');
const sql = require('mssql');
const path = require('path');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: 'master', // connect to master first
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function setupDatabase() {
    try {
        const pool = await new sql.ConnectionPool(config).connect();
        console.log('Connected to master. Running schema.sql...');

        const schemaPath = path.join(__dirname, 'schema.sql');
        let sqlContent = fs.readFileSync(schemaPath, 'utf8');

        // Split statements by GO to execute them separately, as mssql driver does not support GO
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
