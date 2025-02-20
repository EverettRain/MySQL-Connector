import express from 'express';
import dotenv from 'dotenv';
import rawSqlRouter from './routes/raw-sql.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';

app.use(express.json());                // 解析JSON请求体

app.use('/api/raw-sql', rawSqlRouter);  // 注册危险端点

app.listen(port, () => {
    console.log(`危险 API 运行在端口 ${port}`);
    console.log(`使用 API 前缀为 http://${host}:${port}/api/raw-sql/exec`);
});
