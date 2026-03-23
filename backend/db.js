import sql_pkg from 'mssql';
import dotenv from 'dotenv';
dotenv.config();

const { ConnectionPool } = sql_pkg;

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true, // ตั้งค่าการเข้ารหัส (สำหรับ Azure)
        trustServerCertificate: true // สำหรับการพัฒนาในเครื่อง (Local)
    }
};

const poolPromise = new ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Connected to SQL Server');
        return pool;
    })
    .catch(err => {
        console.error('Database Connection Failed! Bad Config: ', err);
    });

export { sql_pkg as sql, poolPromise };
