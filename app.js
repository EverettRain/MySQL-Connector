import express from 'express';
import fs from 'fs';
import path from 'path';
import rawSqlRouter from './routes/router.js';
import dbPools from './config/database.js';

// 配置加载函数
const loadConfig = () => {
    const configPath = path.join(process.cwd(), '_data', 'user.json');

    try {
        // 检查配置文件是否存在
        if (!fs.existsSync(configPath)) {
            throw new Error('未找到配置文件 config/user.json');
        }

        // 读取并解析配置
        const rawConfig = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(rawConfig);

        // 返回合并默认值的配置
        return {
            port: config.port || 3000,
            host: config.host || 'localhost',
            apiPrefix: config.apiPrefix || '/api/raw-sql'
        };
    } catch (error) {
        console.error('配置加载失败:', error.message);
        process.exit(1); // 无法继续运行则直接退出
    }
};

// 初始化配置
const { port, host, apiPrefix } = loadConfig();

const app = express();

app.use(express.json());

// 注册路由
app.use(apiPrefix, rawSqlRouter);

// 启动服务
app.listen(port, host, () => {
    console.log(`--------------------------------------------------`);
    console.log(`API 服务已启动`);
    console.log(`运行地址: http://${host}:${port}${apiPrefix}`);

    // 动态生成所有可用端点
    console.log(`可用端点列表：`);
    Object.keys(dbPools).forEach(poolId => {
        console.log(`• http://${host}:${port}${apiPrefix}/${poolId}/exec`);
    });

    console.log(`--------------------------------------------------`);
    console.log('按下 Ctrl + C 或 Control + C 退出服务进程');
    console.log('日志信息如下：');
});