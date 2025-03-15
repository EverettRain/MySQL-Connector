import express from 'express';
import path from "path";
import fs from "fs";
import { getBeijingISOStringWithZone } from "../application/time.js";

export default function createRouter(dbPools, logSystem) {
    const router = express.Router();

    const COLORS = {
        reset: '\x1b[0m',
        time: '\x1b[90m',    // 灰色时间戳
        sql: '\x1b[37m',     // 白色SQL语句
        success: '\x1b[32m', // 绿色成功状态
        error: '\x1b[31m',   // 红色错误状态
        pool: '\x1b[36m'     // 青色连接池标识
    };

    const configPath = path.join(process.cwd(), '_data', 'user.json');

    if (!fs.existsSync(configPath)) {
        throw new Error('未找到配置文件 config/user.json');
    }

    const rawConfig = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(rawConfig);

    router.post('/exec/:poolId', async (req, res) => {
        const startTime = Date.now();
        const {poolId} = req.params;
        const {sql} = req.body;
        const logEntry = {
            poolId: req.params.poolId,
            sql: req.body.sql
        };

        // 生成基础日志前缀
        const logPrefix = `${COLORS.time}[${getBeijingISOStringWithZone()}] ${COLORS.pool}[${poolId}]${COLORS.reset}`;

        try {
            // 验证连接池是否存在
            if (!dbPools[poolId]) {
                console.log(`${logPrefix} ${COLORS.error}× 无效连接池${COLORS.reset}`);
                
                if(config.logMode){
                    logSystem.addLog({
                        ...logEntry,
                        success: false,
                        duration: Date.now() - startTime,
                        error: '无效连接池'
                    });
                }
                return res.status(404).json({ /* ... */});
            }

            // 执行查询
            const [result] = await dbPools[poolId].query(sql);

            // 成功日志在 logMode = true 时给出
            if (config.logMode) {
                console.log([
                    `${logPrefix} ${COLORS.success}✓ 请求成功${COLORS.reset}`,
                    `${COLORS.sql}SQL: ${sql}${COLORS.reset}`,
                    `耗时: ${Date.now() - startTime}ms`,
                    '----------------------------------------'
                ].join('\n  '));
                
                logSystem.addLog({
                    ...logEntry,
                    success: true,
                    duration: Date.now() - startTime
                });
            }

            res.json({data: result, pool: poolId});

        } catch (error) {
            // 失败日志
            console.log([
                `${logPrefix} ${COLORS.error}✗ 请求失败${COLORS.reset}`,
                `${COLORS.sql}SQL: ${sql}${COLORS.reset}`,
                `${COLORS.error}错误: ${error.code || error.message}${COLORS.reset}`,
                `堆栈: ${error.stack.split('\n')[0]}`, // 只取第一行堆栈
                '----------------------------------------'
            ].join('\n  '));
            
            logSystem.addLog({
                ...logEntry,
                success: false,
                duration: Date.now() - startTime,
                error: error.message
            });

            res.status(500).json({ /* ... */});
        }
    });

    return {
        router,
        updatePools: (newPools) => {
            dbPools = newPools;
        }
    };
}