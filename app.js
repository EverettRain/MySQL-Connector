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
    await initialize();

    const { port, host, apiPrefix } = loadConfig();

    const { loadDatabaseConfig } = await import('./config/database.js');
    dbPools = loadDatabaseConfig();

    const logSystem = initLogSystem(gracefulShutdown);

    const app = express();
    app.use(express.static(path.join(process.cwd(), 'web'))); // 提供静态资源
    app.use(express.json());
    
    const apiRouter = createRouter(dbPools, logSystem);
    
    app.use(apiPrefix, apiRouter.router);

    app.get('/dashboard', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'web', 'dashboard', 'dashboard.html'));
    });

    // 添加 /add-pool 路由
    app.post('/add-pool', express.json(), (req, res) => {
        const { id, host, port, user, password, database } = req.body;

        if (!id || !host || !port || !user || !password || !database) {
            return res.status(400).send('所有字段都是必需的');
        }

        const configPath = path.join(process.cwd(), '_data', 'database.json');
        const rawConfig = fs.readFileSync(configPath, 'utf-8');
        const dbConfig = JSON.parse(rawConfig);

        if (!dbConfig.pools) {
            dbConfig.pools = [];
        }

        dbConfig.pools.push({
            id: id,
            host: host,
            port: port,
            user: user,
            password: password,
            database: database
        });

        fs.writeFileSync(configPath, JSON.stringify(dbConfig, null, 2), 'utf-8');

        const newPools = loadDatabaseConfig(); // 重新加载连接池配置
        apiRouter.updatePools(newPools);

        res.status(200).send('连接池添加成功');
    });

    // 添加 API 路由来获取连接池列表
    app.get('/api/v1/pools', (req, res) => {
        const configPath = path.join(process.cwd(), '_data', 'database.json');
        const rawConfig = fs.readFileSync(configPath, 'utf-8');
        const dbConfig = JSON.parse(rawConfig);
        res.json(dbConfig.pools);
    });

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
        if (!fs.existsSync(configPath)) {
            throw new Error('未找到配置文件 config/user.json');
        }

        const rawConfig = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(rawConfig);

        return {
            port: config.port || 3000,
            host: config.host || 'localhost',
            apiPrefix: config.apiPrefix || '/api/raw-sql'
        };
    } catch (error) {
        console.error('配置加载失败:', error.message);
        process.exit(1);
    }
};

function showStartupInfo(host, port, apiPrefix, in_dbPools) {
    console.log(`--------------------------------------------------`);
    console.log(`API 服务已启动`);
    console.log(`管理后台运行在: http://${host}:${port}/dashboard`);

    console.log(`可用端点列表：`);
    Object.keys(in_dbPools).forEach(poolId => {
        console.log(`• http://${host}:${port}${apiPrefix}/exec/${poolId}`);
    });

    console.log(`--------------------------------------------------`);
    console.log('输入 quit 或 stop 退出服务进程');
}

startServer()
    .then(server => {

    })
    .catch(error => {
        console.error('服务器启动失败:', error);
        process.exit(1);
    });