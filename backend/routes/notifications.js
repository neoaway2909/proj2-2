import express from 'express';
import { poolPromise, sql } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get user notifications
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userId', sql.INT, req.user.id)
            .query('SELECT * FROM Notifications WHERE UserId = @userId ORDER BY CreatedAt DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Mark all as read
router.post('/notifications/read', authenticateToken, async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('userId', sql.INT, req.user.id)
            .query('UPDATE Notifications SET IsRead = 1 WHERE UserId = @userId');
        res.json({ message: "All notifications marked as read" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
