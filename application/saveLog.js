import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import { createSpinner } from 'nanospinner';
import { getBeijingISOStringWithZone } from "./time.js";

let shutdownCallback = () => {};

// 获取当前模块路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 日志存储容器
const queryLogs = [];

// 初始化日志系统
export function initLogSystem(onShutdown) {
    shutdownCallback = onShutdown;
    
    // 监听标准输入
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', handleInput);

    return {
        addLog: (logEntry) => {
            queryLogs.push({
                timestamp: getBeijingISOStringWithZone(),
                ...logEntry
            });
        }
    };
}

// 输入处理函数
function handleInput(input) {
    const command = input.trim().toLowerCase();
    if (command === 'quit' || command === 'stop') {
        process.stdin.pause(); // 暂停输入监听
        quit();
    }
}

// 退出流程
async function quit() {
    const spinner = createSpinner('正在准备退出...');
    spinner.start();

    try {
        await shutdownCallback();

        process.stdin.removeAllListeners('data');
        process.stdin.pause(); // 确保标准输入被暂停
        spinner.stop();
        
        if (queryLogs.length === 0) {
            spinner.success({ text: '本次运行无调用日志' });
            process.exit(0);
        }

        const { shouldSave } = await inquirer.prompt({
            type: 'confirm',
            name: 'shouldSave',
            message: `检测到 ${queryLogs.length} 条调用日志，是否保存？`,
            default: true
        });

        if (!shouldSave) {
            spinner.success({ text: '已放弃保存日志' });
            process.exit(0);
        }

        await saveLogFile();
        spinner.success({ text: '日志文件已保存' });
        process.exit(0);
    } 
    catch (error) {
        console.log(error);
        spinner.error({ text: `退出失败: ${error.message}` });
        process.exit(1);
    }
}

// 保存日志文件
async function saveLogFile() {
    const logsDir = path.join(__dirname, '../_logs');
    const filename = `queryLog_${getBeijingISOStringWithZone()
        .replace(/[:.]/g, '-')
        .slice(0, 19)}.txt`;
    console.log(filename);

    // 创建日志目录
    await fs.mkdir(logsDir, { recursive: true });

    // 生成日志内容
    const logContent = queryLogs
        .map((log, index) => {
            return [
                `[记录 ${index + 1}]`,
                `时间: ${log.timestamp}`,
                `连接池: ${log.poolId}`,
                `SQL: ${log.sql}`,
                `状态: ${log.success ? '成功' : '失败'}`,
                `耗时: ${log.duration}ms`,
                '-----------------------'
            ].join('\n');
        })
        .join('\n\n');

    // 写入文件
    await fs.writeFile(path.join(logsDir, filename), logContent);
}