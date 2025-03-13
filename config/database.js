import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadDatabaseConfig() {
    // 读取JSON配置文件
    const configPath = path.join(__dirname,'..', '_data', 'database.json');
    const rawConfig = fs.readFileSync(configPath, 'utf-8');
    const dbConfig = JSON.parse(rawConfig);

    // 校验配置结构
    if (!dbConfig.pools || !Array.isArray(dbConfig.pools)) {
        throw new Error('Invalid database.json format');
    }

    // 连接池容器
    const connectionPools = {};

    // 遍历创建连接池
    for (const [index, poolConfig] of dbConfig.pools.entries()) {
        const requiredFields = ['id', 'host', 'user'];
        const missingFields = requiredFields.filter(field => !poolConfig[field]);

        if (missingFields.length > 0) {
            throw new Error(`Pool ${index} missing required fields: ${missingFields.join(', ')}`);
        }

        connectionPools[poolConfig.id] = mysql.createPool({
            host: poolConfig.host,
            port: poolConfig.port || 3306,
            user: poolConfig.user,
            password: poolConfig.password || '',
            database: poolConfig.database || '',
            waitForConnections: true,
            connectionLimit: poolConfig.connectionLimit || 5,
            idleTimeout: poolConfig.idleTimeout || 5000,
            queueLimit: poolConfig.queueLimit || 0,
            enableKeepAlive: true
        });
    }
    
    return connectionPools;
}