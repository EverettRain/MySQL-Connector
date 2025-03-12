import fs from 'fs';
import path from 'path';
import { createSpinner } from 'nanospinner';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../_data');
const CONFIG_FILES = {
    user: 'user.json',
    database: 'database.json'
};

// 初始化流程主函数
export async function initialize() {
    const spinner = createSpinner('正在初始化配置...').start();

    try {
        // 确保_data目录存在
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
            spinner.success({ text: `创建数据目录: ${DATA_DIR}` });
        }

        // 检查并创建配置文件
        await checkConfig('user', createUserConfig);
        await checkConfig('database', createDatabaseConfig);

        spinner.success({ text: '配置初始化完成!' });
    } catch (error) {
        spinner.error({ text: `初始化失败: ${error.message}` });
        process.exit(1);
    }
}

// 配置文件检查器
async function checkConfig(type, createFn) {
    const configPath = path.join(DATA_DIR, CONFIG_FILES[type]);

    if (!fs.existsSync(configPath)) {
        console.log(`\n未找到 ${CONFIG_FILES[type]} 配置文件`);
        const config = await createFn();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`✓ 已生成配置文件: ${configPath}`);
    }
}

// 创建用户配置
async function createUserConfig() {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'host',
            message: '请输入服务监听主机:',
            default: 'localhost'
        },
        {
            type: 'number',
            name: 'port',
            message: '请输入服务监听端口:',
            default: 3000,
            validate: input =>
                input > 0 && input < 65535 || '请输入有效端口号 (1-65534)'
        },
        {
            type: 'input',
            name: 'apiPrefix',
            message: '请输入API前缀:',
            default: '/api/v1/query'
        },
        {
            type: 'input',
            name: 'logMode',
            message: '是否需要输出成功访问日志 (true/false):',
            default: true
        }
    ]);
    
    return {
        ...answers,
        security: {
            maxConnections: 10,
            allowDestructive: false
        }
    };
}

// 创建数据库配置
async function createDatabaseConfig() {
    let pools = [];

    // 至少需要一个连接池配置
    do {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'id',
                message: '输入连接池ID (英文标识):',
                validate: input =>
                    /^[a-z0-9_]+$/i.test(input) || '只能包含字母、数字和下划线'
            },
            {
                type: 'input',
                name: 'host',
                message: '数据库主机地址:',
                default: 'localhost'
            },
            {
                type: 'number',
                name: 'port',
                message: '数据库端口:',
                default: 3306
            },
            {
                type: 'input',
                name: 'user',
                message: '数据库用户名:',
                default: 'root'
            },
            {
                type: 'password',
                name: 'password',
                message: '数据库密码:',
                mask: '*'
            },
            {
                type: 'input',
                name: 'database',
                message: '默认数据库名称:'
            },
            {
                type: 'confirm',
                name: 'addMore',
                message: '是否添加更多数据库连接?',
                default: false
            }
        ]);

        pools.push({
            id: answers.id,
            host: answers.host,
            port: answers.port,
            user: answers.user,
            password: answers.password,
            database: answers.database
        });

    } while (pools.slice(-1)[0].addMore);

    return { pools };
}