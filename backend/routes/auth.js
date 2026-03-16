import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { poolPromise, sql } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Register Route (Public, only creates users)
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const role = 'user'; // Force role to user for public registration

    try {
        const pool = await poolPromise;
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.request()
            .input('username', sql.NVARCHAR, username)
            .input('password', sql.NVARCHAR, hashedPassword)
            .input('role', sql.NVARCHAR, role)
            .query('INSERT INTO Users (Username, Password, Role) VALUES (@username, @password, @role)');

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('username', sql.NVARCHAR, username)
            .query('SELECT * FROM Users WHERE Username = @username');

        const user = result.recordset[0];

        if (!user || !(await bcrypt.compare(password, user.Password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.Id, username: user.Username, role: user.Role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token, role: user.Role, username: user.Username });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Protected Route Example
router.get('/me', authenticateToken, (req, res) => {
    res.json(req.user);
});

export default router;
