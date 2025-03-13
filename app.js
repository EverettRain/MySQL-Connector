import express from 'express';
import fs from 'fs';
import path from 'path';
import createRouter from './routes/router.js';
import { initialize } from './application/initialize.js';
import { loadDatabaseConfig } from "./config/database.js";
import { initLogSystem } from "./application/saveLog.js";

let dbPools;
let server;

function gracefulShutdown() {
    return new Promise((resolve) => {
        if (server) {
            server.close(() => {
                console.log('\n✓ 服务器已停止监听');
                resolve();
            });
        } else {
            resolve();
        }
    });
}

async function startServer() {
    // 先执行初始化检测（新增）
    await initialize();

    // 原配置加载逻辑保持不变
    const { port, host, apiPrefix } = loadConfig();

    const { loadDatabaseConfig } = await import('./config/database.js');
    dbPools = loadDatabaseConfig();

    const logSystem = initLogSystem(gracefulShutdown);
    
    const app = express();
    app.use(express.json());
    app.use(apiPrefix, createRouter(dbPools, logSystem));

    server = app.listen(port, host, () => {
        showStartupInfo(host, port, apiPrefix, dbPools);
    }).on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`✗ 端口 ${port} 被占用，请更换端口或终止占用进程`);
        } else {
            console.error('服务器启动失败:', error.message);
        }
        process.exit(1);
    });
    
    return server;
}

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

function showStartupInfo(host, port, apiPrefix, in_dbPools) {
    console.log(`--------------------------------------------------`);
    console.log(`API 服务已启动`);
    console.log(`运行地址: http://${host}:${port}${apiPrefix}`);

    console.log(`可用端点列表：`);
    Object.keys(in_dbPools).forEach(poolId => {
        console.log(`• http://${host}:${port}${apiPrefix}/exec/${poolId}`);
    });

    console.log(`--------------------------------------------------`);
    console.log('输入 quit 退出服务进程');
}

startServer()
    .then(server => {
        
    })
    .catch(error => {
        console.error('服务器启动失败:', error);
        process.exit(1);
    });