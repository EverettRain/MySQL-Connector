// routes/raw-sql.js
import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

router.post('/exec', async (req, res) => {
    try {
        const { sql } = req.body;
        const [result] = await pool.query(sql); // 直接执行原始SQL
        res.json({ data: result });
    } catch (error) {
        console.error('数据库查询错误:', error);
        res.status(500).json({
            error: '服务器内部错误',
            code: error.code || 'UNKNOWN_ERROR'
        });
    }
});

export default router;