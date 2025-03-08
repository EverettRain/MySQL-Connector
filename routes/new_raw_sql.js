import express from 'express';
import database from '../config/database.js';

const new_router = express.Router();

new_router.post('/exec', async (req, res) => {
    try {
        const { sql } = req.body;
        const [result] = await database.newpool.query(sql); // 直接执行原始SQL
        res.json({ data: result });
    } catch (error) {
        console.error('数据库查询错误:', error);
        res.status(500).json({
            error: '服务器内部错误',
            code: error.code || 'UNKNOWN_ERROR'
        });
    }
});

export default new_router;