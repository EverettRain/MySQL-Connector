import express from 'express';
import fs from 'fs';
import path from 'path';
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
const userConfigPath = path.join(process.cwd(), '_data', 'user.json');

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

// 配置加载函数
function loadConfig() {
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
}

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

async function startServer() {
    await initialize();
    initSecurity();

    const { port, host, apiPrefix } = loadConfig();

    dbPools = loadDatabaseConfig();

    const logSystem = initLogSystem(gracefulShutdown);

    const app = express();

    // 基础中间件
    app.use(express.static(path.join(process.cwd(), 'web')));
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

    // 创建API路由
    const apiRouter = createRouter(dbPools, logSystem);
    app.use(apiPrefix, apiRouter.router);

    // 获取API前缀路由
    app.get('/api/api-prefix', (req, res) => {
        try {
            fs.readFile(userConfigPath, 'utf8', (err, data) => {
                if (err) {
                    console.error('读取用户设置失败:', err);
                    return res.status(500).json({ error: '无法读取用户设置' });
                }

                try {
                    const config = JSON.parse(data);
                    res.json({ 
                        apiPrefix: config.apiPrefix || '/api/v1/query',
                        host: config.host || 'localhost',
                        port: config.port || 3000
                    });
                } catch (parseError) {
                    console.error('解析配置文件失败:', parseError);
                    res.status(500).json({ error: '无法解析配置文件' });
                }
            });
        } catch (error) {
            console.error('获取API前缀失败:', error);
            res.status(500).json({ error: '获取API前缀失败' });
        }
    });

    // 登录页面路由 - 无需认证
    app.get('/login', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'web', 'login', 'login.html'));
    });

    // 首页重定向
    app.get('/', (req, res) => {
        if (req.session.securityAuthenticated) {
            res.redirect('/dashboard');
        } else {
            res.redirect('/login');
        }
    });

    // 安全相关API路由 - 无需认证即可访问的端点
    const publicSecurityRoutes = express.Router();

    publicSecurityRoutes.get('/check-auth', (req, res) => {
        res.json({ authenticated: !!req.session.securityAuthenticated });
    });

    publicSecurityRoutes.get('/has-password', (req, res) => {
        res.json({ hasPassword: hasAdminPassword() });
    });

    publicSecurityRoutes.post('/verify-password', express.json(), (req, res) => {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: '密码不能为空' });
        }

        const isValid = verifyAdminPassword(password);

        if (isValid) {
            req.session.securityAuthenticated = true;
            req.session.save();
        }

        res.json({ valid: isValid });
    });

    publicSecurityRoutes.post('/set-password', express.json(), (req, res) => {
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({ error: '密码不能为空且长度至少为6个字符' });
        }

        const result = setAdminPassword(password);

        if (!result.error) {
            req.session.securityAuthenticated = true;
        }

        if (result.error) {
            return res.status(500).json({ error: result.error, message: result.message });
        }

        res.json(result);
    });

    publicSecurityRoutes.post('/logout', (req, res) => {
        req.session.securityAuthenticated = false;
        res.json({ success: true });
    });

    // 挂载公共安全路由
    app.use('/api/v1/security', publicSecurityRoutes);

    // 身份验证中间件
    const authMiddleware = (req, res, next) => {
        // 排除已知的公共路径
        const publicPaths = [
            '/login',
            '/api/v1/security/check-auth',
            '/api/v1/security/has-password',
            '/api/v1/security/verify-password',
            '/api/v1/security/set-password',
            '/api/v1/security/logout'
        ];

        if (req.path.startsWith(apiPrefix)) {
            return next();
        }

        if (publicPaths.includes(req.path)) {
            return next();
        }

        // 检查会话中的验证状态
        if (!req.session.securityAuthenticated) {
            // 如果是API请求，返回401状态码
            if (req.path.startsWith('/api/')) {
                return res.status(401).json({ error: '未经授权的访问' });
            }
            // 如果是页面请求，重定向到登录页面
            return res.redirect('/login');
        }

        next();
    };

    // 从此处开始应用身份验证中间件
    app.use(authMiddleware);

    // 控制台日志中间件（仅应用于认证后的路由）
    app.use((req, res, next) => {
        // console.log(`${req.method} ${req.path}`);
        // console.log('会话ID:', req.sessionID);
        // console.log('认证状态:', req.session.securityAuthenticated);
        next();
    });

    // 仪表板页面
    app.get('/dashboard', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'web', 'dashboard', 'dashboard.html'));
    });

    // 受保护的安全API路由
    const protectedSecurityRoutes = express.Router();

    // 通用设置
    protectedSecurityRoutes.get('/general-settings', (req, res) => {
        const settings = getGeneralSettings();
        res.json(settings);
    });

    protectedSecurityRoutes.put('/general-settings', express.json(), (req, res) => {
        const settings = req.body;

        // 移除useGlobalPassword字段，确保不再使用
        if (settings.useGlobalPassword !== undefined) {
            delete settings.useGlobalPassword;
        }

        const result = updateGeneralSettings(settings);

        if (result.error) {
            return res.status(500).json({ error: result.error, message: result.message });
        }

        res.json({ success: true });
    });

    // 获取用户设置
    protectedSecurityRoutes.get('/user-settings', (req, res) => {
        fs.readFile(userConfigPath, 'utf8', (err, data) => {
            if (err) {
                console.error('读取用户设置失败:', err);
                return res.status(500).json({ error: '无法读取用户设置' });
            }

            try {
                const config = JSON.parse(data);

                // 移除敏感信息
                const safeConfig = { ...config };
                delete safeConfig.password;
                delete safeConfig.passwordSalt;

                res.json(safeConfig);
            } catch (parseError) {
                console.error('解析配置文件失败:', parseError);
                res.status(500).json({ error: '无法解析配置文件' });
            }
        });
    });

    protectedSecurityRoutes.put('/user-settings', (req, res) => {
        // 检查用户是否已认证
        if (!req.session || !req.session.securityAuthenticated) {
            return res.status(401).json({ error: '未授权访问' });
        }

        // 读取当前配置
        fs.readFile(userConfigPath, 'utf8', (err, data) => {
            if (err) {
                console.error('读取用户设置失败:', err);
                return res.status(500).json({ error: '无法读取用户设置' });
            }

            try {
                const currentConfig = JSON.parse(data);

                // 合并新设置，保留敏感信息
                const newConfig = {
                    ...req.body,
                    password: currentConfig.password,
                    passwordSalt: currentConfig.passwordSalt,
                    passwordUpdated: currentConfig.passwordUpdated
                };

                // 验证必要字段
                if (!newConfig.host || !newConfig.port || !newConfig.apiPrefix) {
                    return res.status(400).json({ error: '主机、端口和API前缀为必填项' });
                }

                // 保存到文件
                fs.writeFile(userConfigPath, JSON.stringify(newConfig, null, 2), 'utf8', (writeErr) => {
                    if (writeErr) {
                        console.error('保存用户设置失败:', writeErr);
                        return res.status(500).json({ error: '无法保存用户设置' });
                    }

                    res.json({ success: true, message: '用户设置已更新' });
                });
            } catch (parseError) {
                console.error('解析配置文件失败:', parseError);
                res.status(500).json({ error: '无法解析配置文件' });
            }
        });
    });

    // 密钥管理
    protectedSecurityRoutes.get('/keys', (req, res) => {
        const result = getAllApiKeys();

        if (result.error) {
            return res.status(500).json({ error: result.error, message: result.message });
        }

        res.json(result);
    });

    protectedSecurityRoutes.post('/keys', express.json(), (req, res) => {
        const { name, description } = req.body;
        const result = addApiKey(name, description || '');

        if (result.error) {
            return res.status(400).json({ error: result.error, message: result.message });
        }

        res.status(201).json(result);
    });

    protectedSecurityRoutes.put('/keys/:keyId', express.json(), (req, res) => {
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

    protectedSecurityRoutes.delete('/keys/:keyId', (req, res) => {
        const { keyId } = req.params;
        const result = deleteApiKey(keyId);

        if (result.error) {
            return res.status(result.error.includes('未找到') ? 404 : 500)
                .json({ error: result.error, message: result.message });
        }

        res.json(result);
    });

    protectedSecurityRoutes.post('/keys/:keyId/rotate', (req, res) => {
        const { keyId } = req.params;
        const result = rotateApiKey(keyId);

        if (result.error) {
            return res.status(result.error.includes('未找到') ? 404 : 500)
                .json({ error: result.error, message: result.message });
        }

        res.json(result);
    });

    // 修改密码
    protectedSecurityRoutes.post('/change-password', express.json(), (req, res) => {
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

    // 挂载受保护的安全路由
    app.use('/api/v1/security', protectedSecurityRoutes);

    // 连接池管理API
    app.post('/add-pool', express.json(), (req, res) => {
        const { id, host, port, user, password, database } = req.body;

        if (!id || !host || !port || !user || !password || !database) {
            return res.status(400).send('所有字段都是必需的');
        }

        try {
            const configPath = path.join(process.cwd(), '_data', 'database.json');
            const rawConfig = fs.readFileSync(configPath, 'utf-8');
            const dbConfig = JSON.parse(rawConfig);

            if (!dbConfig.pools) {
                dbConfig.pools = [];
            }

            // 检查ID是否已存在
            if (dbConfig.pools.some(pool => pool.id === id)) {
                return res.status(400).send('连接池ID已存在');
            }

            dbConfig.pools.push({
                id, host, port, user, password, database
            });

            fs.writeFileSync(configPath, JSON.stringify(dbConfig, null, 2), 'utf-8');

            const newPools = loadDatabaseConfig(); // 重新加载连接池配置
            apiRouter.updatePools(newPools);

            res.status(200).send('连接池添加成功');
        } catch (error) {
            console.error('添加连接池失败:', error);
            res.status(500).send('添加连接池失败: ' + error.message);
        }
    });

    app.get('/api/v1/pools', (req, res) => {
        try {
            const configPath = path.join(process.cwd(), '_data', 'database.json');
            const rawConfig = fs.readFileSync(configPath, 'utf-8');
            const dbConfig = JSON.parse(rawConfig);
            res.json(dbConfig.pools || []);
        } catch (error) {
            console.error('获取连接池列表失败:', error);
            res.status(500).json({ error: '获取连接池列表失败: ' + error.message });
        }
    });

    app.get('/api/v1/pools/:id', (req, res) => {
        try {
            const { id } = req.params;
            const configPath = path.join(process.cwd(), '_data', 'database.json');
            const rawConfig = fs.readFileSync(configPath, 'utf-8');
            const dbConfig = JSON.parse(rawConfig);

            const pool = dbConfig.pools?.find(p => p.id === id);
            if (!pool) {
                return res.status(404).send('连接池未找到');
            }

            res.json(pool);
        } catch (error) {
            console.error('获取连接池详情失败:', error);
            res.status(500).json({ error: '获取连接池详情失败: ' + error.message });
        }
    });

    app.put('/api/v1/pools/:id', express.json(), (req, res) => {
        try {
            const { id } = req.params;
            const { host, port, user, password, database } = req.body;

            if (!host || !port || !user || !password || !database) {
                return res.status(400).send('所有字段都是必需的');
            }

            const configPath = path.join(process.cwd(), '_data', 'database.json');
            const rawConfig = fs.readFileSync(configPath, 'utf-8');
            let dbConfig = JSON.parse(rawConfig);

            if (!dbConfig.pools) {
                return res.status(404).send('连接池未找到');
            }

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
        } catch (error) {
            console.error('更新连接池失败:', error);
            res.status(500).send('更新连接池失败: ' + error.message);
        }
    });

    app.delete('/api/v1/pools/:id', (req, res) => {
        try {
            const { id } = req.params;
            const configPath = path.join(process.cwd(), '_data', 'database.json');
            const rawConfig = fs.readFileSync(configPath, 'utf-8');
            let dbConfig = JSON.parse(rawConfig);

            if (!dbConfig.pools) {
                return res.status(404).send('连接池未找到');
            }

            const poolIndex = dbConfig.pools.findIndex(p => p.id === id);
            if (poolIndex === -1) {
                return res.status(404).send('连接池未找到');
            }

            dbConfig.pools.splice(poolIndex, 1);

            fs.writeFileSync(configPath, JSON.stringify(dbConfig, null, 2), 'utf-8');

            const newPools = loadDatabaseConfig(); // 重新加载连接池配置
            apiRouter.updatePools(newPools);

            res.status(200).send('连接池删除成功');
        } catch (error) {
            console.error('删除连接池失败:', error);
            res.status(500).send('删除连接池失败: ' + error.message);
        }
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

// 启动服务器
startServer()
    .then(server => {
        // 成功启动服务器
    })
    .catch(error => {
        console.error('服务器启动失败:', error);
        process.exit(1);
    });
