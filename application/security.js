import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// 安全配置文件路径
const securityPath = path.join(process.cwd(), '_data', 'security.json');

// 生成随机盐值
function generateSalt() {
    return crypto.randomBytes(16).toString('hex');
}

// 使用盐值对密钥进行哈希处理
function hashKey(key, salt) {
    return crypto.pbkdf2Sync(key, salt, 10000, 64, 'sha512').toString('hex');
}

// 初始化安全配置
export function initSecurity() {
    if (!fs.existsSync(securityPath)) {
        // 生成初始默认密钥
        const plainKey = "default-api-key-000000";
        const salt = generateSalt();
        const hashedKey = hashKey(plainKey, salt);

        const initialSecurity = {
            apiKeys: [
                {
                    keyId: "default-key-" + crypto.randomBytes(4).toString('hex'),
                    hashedKey: hashedKey,
                    salt: salt,
                    name: "初始密钥",
                    description: "系统默认生成的API密钥",
                    created: new Date().toISOString()
                }
            ]
        };
        fs.writeFileSync(securityPath, JSON.stringify(initialSecurity, null, 2), 'utf-8');
        console.log('✓ 已创建默认安全配置文件');
        console.log(`✓ 已创建默认API密钥，需要使用请前往安全设置进行轮换再使用`);
    }
}

// 验证API密钥
export function validateApiKey(apiKey) {
    try {
        const securityData = JSON.parse(fs.readFileSync(securityPath, 'utf-8'));

        // 遍历所有密钥进行验证
        return securityData.apiKeys.some(entry => {
            const hashedInputKey = hashKey(apiKey, entry.salt);
            return hashedInputKey === entry.hashedKey;
        });
    } catch (error) {
        console.error('验证API密钥时出错:', error);
        return false;
    }
}

// API密钥验证中间件
export function apiKeyMiddleware(req, res, next) {
    const apiKey = req.body?.apiKey;

    if (!apiKey) {
        return res.status(401).json({
            error: "未提供API密钥",
            message: "请在请求体中包含apiKey字段"
        });
    }

    // 使用validateApiKey函数验证密钥
    const isValidKey = validateApiKey(apiKey);

    if (!isValidKey) {
        return res.status(401).json({
            error: "无效的API密钥",
            message: "提供的API密钥无效或已过期"
        });
    }

    next();
}

// 获取所有API密钥（安全版本，不返回哈希值和盐值）
export function getAllApiKeys() {
    try {
        if (!fs.existsSync(securityPath)) {
            return { error: '安全配置文件不存在' };
        }

        const rawData = fs.readFileSync(securityPath, 'utf-8');
        const securityData = JSON.parse(rawData);

        // 返回密钥列表
        return securityData.apiKeys.map(key => ({
            id: key.keyId,
            name: key.name,
            description: key.description,
            created: key.created
        }));
    } catch (error) {
        return { error: '获取API密钥失败', message: error.message };
    }
}

// 添加新API密钥
export function addApiKey(name, description = '') {
    try {
        if (!name) {
            return { error: '密钥名称是必需的' };
        }

        // 生成随机API密钥
        const plainKey = `key-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
        const keyId = "key-" + crypto.randomBytes(4).toString('hex');
        const salt = generateSalt();
        const hashedKey = hashKey(plainKey, salt);

        let securityData = { apiKeys: [] };

        if (fs.existsSync(securityPath)) {
            const rawData = fs.readFileSync(securityPath, 'utf-8');
            securityData = JSON.parse(rawData);
        }

        // 添加新密钥
        securityData.apiKeys.push({
            keyId,
            hashedKey,
            salt,
            name,
            description,
            created: new Date().toISOString()
        });

        fs.writeFileSync(securityPath, JSON.stringify(securityData, null, 2), 'utf-8');

        // 返回结果中包含明文密钥（仅在创建时返回一次）
        return {
            success: true,
            message: '请妥善保存此API密钥，它不会再次显示',
            keyId,
            key: plainKey, // 仅创建时返回一次
            name,
            description
        };
    } catch (error) {
        return { error: '创建API密钥失败', message: error.message };
    }
}

// 删除API密钥
export function deleteApiKey(keyId) {
    try {
        if (!fs.existsSync(securityPath)) {
            return { error: '安全配置文件不存在' };
        }

        const rawData = fs.readFileSync(securityPath, 'utf-8');
        const securityData = JSON.parse(rawData);

        const initialLength = securityData.apiKeys.length;
        securityData.apiKeys = securityData.apiKeys.filter(k => k.keyId !== keyId);

        if (securityData.apiKeys.length === initialLength) {
            return { error: '未找到指定的API密钥' };
        }

        fs.writeFileSync(securityPath, JSON.stringify(securityData, null, 2), 'utf-8');

        return { success: true, message: 'API密钥删除成功' };
    } catch (error) {
        return { error: '删除API密钥失败', message: error.message };
    }
}

// 添加API密钥轮换功能
export function rotateApiKey(keyId) {
    try {
        if (!fs.existsSync(securityPath)) {
            return { error: '安全配置文件不存在' };
        }

        const rawData = fs.readFileSync(securityPath, 'utf-8');
        const securityData = JSON.parse(rawData);

        const keyIndex = securityData.apiKeys.findIndex(k => k.keyId === keyId);
        if (keyIndex === -1) {
            return { error: '未找到指定的API密钥' };
        }

        // 保留原密钥信息
        const keyInfo = securityData.apiKeys[keyIndex];

        // 生成新的密钥和盐值
        const plainKey = `key-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
        const salt = generateSalt();
        const hashedKey = hashKey(plainKey, salt);

        // 更新密钥信息
        securityData.apiKeys[keyIndex] = {
            ...keyInfo,
            hashedKey,
            salt,
            rotated: new Date().toISOString()
        };

        fs.writeFileSync(securityPath, JSON.stringify(securityData, null, 2), 'utf-8');

        // 返回新密钥
        return {
            success: true,
            message: '密钥已成功轮换，请妥善保存新密钥',
            keyId,
            key: plainKey,
            name: keyInfo.name
        };
    } catch (error) {
        return { error: '轮换API密钥失败', message: error.message };
    }
}

export function updateApiKey(keyId, name, description) {
    try {
        if (!fs.existsSync(securityPath)) {
            return { error: '安全配置文件不存在' };
        }

        const rawData = fs.readFileSync(securityPath, 'utf-8');
        const securityData = JSON.parse(rawData);

        const keyIndex = securityData.apiKeys.findIndex(k => k.keyId === keyId);
        if (keyIndex === -1) {
            return { error: '未找到指定的API密钥' };
        }

        // 更新密钥信息
        securityData.apiKeys[keyIndex].name = name;
        securityData.apiKeys[keyIndex].description = description;
        securityData.apiKeys[keyIndex].updated = new Date().toISOString();

        fs.writeFileSync(securityPath, JSON.stringify(securityData, null, 2), 'utf-8');

        return {
            success: true,
            message: 'API密钥信息更新成功',
            keyId,
            name,
            description
        };
    } catch (error) {
        return { error: '更新API密钥失败', message: error.message };
    }
}

// 检查是否设置了管理密码
export function hasAdminPassword() {
    try {
        const userConfigPath = path.join(process.cwd(), '_data', 'user.json');
        if (!fs.existsSync(userConfigPath)) {
            return false;
        }

        const userData = JSON.parse(fs.readFileSync(userConfigPath, 'utf-8'));
        return !!userData.password;
    } catch (error) {
        console.error('检查管理密码时出错:', error);
        return false;
    }
}

// 验证管理密码
export function verifyAdminPassword(password) {
    try {
        console.log("开始验证密码...");
        const userConfigPath = path.join(process.cwd(), '_data', 'user.json');

        if (!fs.existsSync(userConfigPath)) {
            console.log("用户配置文件不存在");
            return false;
        }

        const userData = JSON.parse(fs.readFileSync(userConfigPath, 'utf-8'));
        // console.log("读取到用户数据:", JSON.stringify({
        //     hasPassword: !!userData.password,
        //     hasSalt: !!userData.passwordSalt
        // }));

        if (!userData.password || !userData.passwordSalt) {
            console.log("密码或盐值不存在");
            return false;
        }

        const hashedPassword = hashKey(password, userData.passwordSalt);
        // console.log("输入密码哈希:", hashedPassword.substring(0, 10) + "...");
        // console.log("存储密码哈希:", userData.password.substring(0, 10) + "...");
        console.log("密码匹配:", hashedPassword === userData.password);

        return hashedPassword === userData.password;
    } catch (error) {
        console.error('验证管理密码时出错:', error);
        return false;
    }
}

// 设置管理密码
export function setAdminPassword(password) {
    try {
        const userConfigPath = path.join(process.cwd(), '_data', 'user.json');
        if (!fs.existsSync(userConfigPath)) {
            return { error: '用户配置文件不存在' };
        }

        const userData = JSON.parse(fs.readFileSync(userConfigPath, 'utf-8'));

        // 生成盐值和哈希密码
        const salt = generateSalt();
        const hashedPassword = hashKey(password, salt);

        // 更新用户配置
        userData.password = hashedPassword;
        userData.passwordSalt = salt;
        userData.passwordUpdated = new Date().toISOString();

        fs.writeFileSync(userConfigPath, JSON.stringify(userData, null, 2), 'utf-8');

        return { success: true, message: '管理密码设置成功' };
    } catch (error) {
        return { error: '设置管理密码失败', message: error.message };
    }
}

export function getGeneralSettings() {
    try {
        const settingsPath = path.join(process.cwd(), '_data', 'general_settings.json');

        if (!fs.existsSync(settingsPath)) {
            // 创建默认设置
            const defaultSettings = {  };
            fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
            return defaultSettings;
        }

        const rawData = fs.readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(rawData);

        if (settings.useGlobalPassword !== undefined) {
            delete settings.useGlobalPassword;
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        }

        return settings;
    } catch (error) {
        console.error('获取通用设置时出错:', error);
        return {  };
    }
}

export function updateGeneralSettings(settings) {
    try {
        const settingsPath = path.join(process.cwd(), '_data', 'general_settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        console.error('更新通用设置时出错:', error);
        return { error: '更新设置失败', message: error.message };
    }
}

// 修改管理员密码
export function changeAdminPassword(currentPassword, newPassword) {
    try {
        // 验证当前密码
        if (!verifyAdminPassword(currentPassword)) {
            return { error: '当前密码不正确' };
        }

        // 验证新密码不能与当前密码相同
        if (currentPassword === newPassword) {
            return { error: '新密码不能与当前密码相同' };
        }

        // 验证新密码长度
        if (newPassword.length < 6) {
            return { error: '新密码长度至少为6个字符' };
        }

        const userConfigPath = path.join(process.cwd(), '_data', 'user.json');
        if (!fs.existsSync(userConfigPath)) {
            return { error: '用户配置文件不存在' };
        }

        const userData = JSON.parse(fs.readFileSync(userConfigPath, 'utf-8'));

        // 生成新的盐值和哈希密码
        const salt = generateSalt();
        
        // 更新用户配置
        userData.password = hashKey(newPassword, salt);
        userData.passwordSalt = salt;
        userData.passwordUpdated = new Date().toISOString();

        fs.writeFileSync(userConfigPath, JSON.stringify(userData, null, 2), 'utf-8');

        return { success: true, message: '管理密码修改成功' };
    } catch (error) {
        console.error('修改管理密码时出错:', error);
        return { error: '修改管理密码失败', message: error.message };
    }
}