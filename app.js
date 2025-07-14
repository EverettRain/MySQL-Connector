import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto'; // 添加缺少的导入
import createRouter from './routes/router.js';
import { initialize } from './application/initialize.js';
import { loadDatabaseConfig } from "./config/database.js";
import { initLogSystem } from "./application/saveLog.js";
import {
    initSecurity,
    getAllApiKeys,
    addApiKey,
    deleteApiKey,
    rotateApiKey,
    updateApiKey,
    hasAdminPassword,
    verifyAdminPassword,
    setAdminPassword,
    getGeneralSettings,
    updateGeneralSettings,
    changeAdminPassword
} from './application/security.js';
import session from 'express-session';

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
    initSecurity();

    const { port, host, apiPrefix } = loadConfig();

    dbPools = loadDatabaseConfig();

    const logSystem = initLogSystem(gracefulShutdown);

    const app = express();

    // 基础中间件
    app.use(express.static(path.join(process.cwd(), 'web'))); // 提供静态资源
    app.use(express.json());

    // 配置会话
    app.use(session({
        secret: 'everett_rain',
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 会话有效期1天
        }
    }));

    // 安全验证中间件
    const securityAuthMiddleware = (req, res, next) => {
        console.log("安全中间件检查路径:", req.path);
        console.log("当前认证状态:", req.session.securityAuthenticated);

        // 如果是验证密码或设置密码的请求，则放行
        if (
            req.path === '/verify-password' ||
            req.path === '/set-password' ||
            req.path === '/has-password'
        ) {
            console.log("密码验证相关路径，放行");
            return next();
        }

        // 如果是密钥管理API
        if (req.path.startsWith('/keys')) {
            // 对于密钥管理API，检查会话中的验证状态
            if (!req.session.securityAuthenticated) {
                console.log("未经认证，拒绝访问");
                return res.status(401).json({ error: '未经授权的访问' });
            }
        }

        console.log("已认证，放行");
        next();
    };

    // 创建API路由
    const apiRouter = createRouter(dbPools, logSystem);
    app.use(apiPrefix, apiRouter.router);

    // 页面路由
    app.get('/dashboard', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'web', 'dashboard', 'dashboard.html'));
    });

    // 连接池管理API
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

    app.get('/api/v1/pools', (req, res) => {
        const configPath = path.join(process.cwd(), '_data', 'database.json');
        const rawConfig = fs.readFileSync(configPath, 'utf-8');
        const dbConfig = JSON.parse(rawConfig);
        res.json(dbConfig.pools);
    });

    app.get('/api/v1/pools/:id', (req, res) => {
        const { id } = req.params;
        const configPath = path.join(process.cwd(), '_data', 'database.json');
        const rawConfig = fs.readFileSync(configPath, 'utf-8');
        const dbConfig = JSON.parse(rawConfig);

        const pool = dbConfig.pools.find(p => p.id === id);
        if (!pool) {
            return res.status(404).send('连接池未找到');
        }

        res.json(pool);
    });

    app.put('/api/v1/pools/:id', express.json(), (req, res) => {
        const { id } = req.params;
        const { host, port, user, password, database } = req.body;

        if (!host || !port || !user || !password || !database) {
            return res.status(400).send('所有字段都是必需的');
        }

        const configPath = path.join(process.cwd(), '_data', 'database.json');
        const rawConfig = fs.readFileSync(configPath, 'utf-8');
        let dbConfig = JSON.parse(rawConfig);

        const poolIndex = dbConfig.pools.findIndex(p => p.id === id);
        if (poolIndex === -1) {
            return res.status(404).send('连接池未找到');
        }

        dbConfig.pools[poolIndex] = {
            ...dbConfig.pools[poolIndex],
            host,
            port,
            user,
            password,
            database
        };

        fs.writeFileSync(configPath, JSON.stringify(dbConfig, null, 2), 'utf-8');

        const newPools = loadDatabaseConfig(); // 重新加载连接池配置
        apiRouter.updatePools(newPools);

        res.status(200).send('连接池更新成功');
    });

    app.delete('/api/v1/pools/:id', (req, res) => {
        const { id } = req.params;
        const configPath = path.join(process.cwd(), '_data', 'database.json');
        const rawConfig = fs.readFileSync(configPath, 'utf-8');
        let dbConfig = JSON.parse(rawConfig);

        const poolIndex = dbConfig.pools.findIndex(p => p.id === id);
        if (poolIndex === -1) {
            return res.status(404).send('连接池未找到');
        }

        dbConfig.pools.splice(poolIndex, 1);

        fs.writeFileSync(configPath, JSON.stringify(dbConfig, null, 2), 'utf-8');

        const newPools = loadDatabaseConfig(); // 重新加载连接池配置
        apiRouter.updatePools(newPools);

        res.status(200).send('连接池删除成功');
    });

    // 密码验证API（不需要通过中间件验证）
    app.get('/api/v1/security/has-password', (req, res) => {
        res.json({ hasPassword: hasAdminPassword() });
    });

    // 获取通用设置
    app.get('/api/v1/security/general-settings', (req, res) => {
        const settings = getGeneralSettings();
        res.json(settings);
    });

    // 更新通用设置 (需要验证)
    app.put('/api/v1/security/general-settings', securityAuthMiddleware, express.json(), (req, res) => {
        const settings = req.body;

        // 简单验证
        if (settings.useGlobalPassword === undefined) {
            return res.status(400).json({ error: '缺少必要的设置字段' });
        }

        const result = updateGeneralSettings(settings);

        if (result.error) {
            return res.status(500).json({ error: result.error, message: result.message });
        }

        res.json({ success: true });
    });

    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        console.log('会话ID:', req.sessionID);
        console.log('认证状态:', req.session.securityAuthenticated);
        next();
    });

    app.post('/api/v1/security/verify-password', express.json(), (req, res) => {
        const { password } = req.body;
        console.log("收到密码验证请求:", password ? "有密码" : "无密码");

        if (!password) {
            return res.status(400).json({ error: '密码不能为空' });
        }

        const isValid = verifyAdminPassword(password);
        console.log("密码验证结果:", isValid);

        if (isValid) {
            // 设置会话验证状态
            req.session.securityAuthenticated = true;
            // 保存会话以确保状态被记录
            req.session.save(err => {
                if (err) {
                    console.error("保存会话出错:", err);
                }
                console.log("会话已保存, 认证状态:", req.session.securityAuthenticated);
            });
        }

        res.json({ valid: isValid });
    });

    app.post('/api/v1/security/set-password', express.json(), (req, res) => {
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ error: '密码不能为空且长度至少为6个字符' });
        }

        const result = setAdminPassword(password);

        if (!result.error) {
            // 设置会话验证状态
            req.session.securityAuthenticated = true;
        }

        if (result.error) {
            return res.status(500).json({ error: result.error, message: result.message });
        }

        res.json(result);
    });

    // 登出API
    app.post('/api/v1/security/logout', (req, res) => {
        req.session.securityAuthenticated = false;
        res.json({ success: true });
    });

    // 应用安全中间件到所有安全管理API
    app.use('/api/v1/security', securityAuthMiddleware);

    // 需要通过中间件验证的安全API
    app.get('/api/v1/security/keys', (req, res) => {
        const result = getAllApiKeys();

        if (result.error) {
            return res.status(500).json({ error: result.error, message: result.message });
        }

        res.json(result);
    });

    // 添加修改密码API路由
    app.post('/api/v1/security/change-password', securityAuthMiddleware, express.json(), (req, res) => {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: '当前密码和新密码都是必需的' });
        }

        const result = changeAdminPassword(currentPassword, newPassword);

        if (result.error) {
            return res.status(400).json({ error: result.error, message: result.message });
        }

        res.json(result);
    });

    app.post('/api/v1/security/keys', express.json(), (req, res) => {
        const { name, description } = req.body;
        const result = addApiKey(name, description || '');

        if (result.error) {
            return res.status(400).json({ error: result.error, message: result.message });
        }

        res.status(201).json(result);
    });

    app.put('/api/v1/security/keys/:keyId', express.json(), (req, res) => {
        const { keyId } = req.params;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: '密钥名称是必需的' });
        }

        const result = updateApiKey(keyId, name, description || '');

        if (result.error) {
            return res.status(result.error.includes('未找到') ? 404 : 500)
                .json({ error: result.error, message: result.message });
        }

        res.json(result);
    });

    app.delete('/api/v1/security/keys/:keyId', (req, res) => {
        const { keyId } = req.params;
        const result = deleteApiKey(keyId);

        if (result.error) {
            return res.status(result.error.includes('未找到') ? 404 : 500)
                .json({ error: result.error, message: result.message });
        }

        res.json(result);
    });

    app.post('/api/v1/security/keys/:keyId/rotate', (req, res) => {
        const { keyId } = req.params;
        const result = rotateApiKey(keyId);

        if (result.error) {
            return res.status(result.error.includes('未找到') ? 404 : 500)
                .json({ error: result.error, message: result.message });
        }

        res.json(result);
    });

    // 启动服务器
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
        // 成功启动服务器
    })
    .catch(error => {
        console.error('服务器启动失败:', error);
        process.exit(1);
    });