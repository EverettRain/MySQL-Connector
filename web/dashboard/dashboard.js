// 导入模块
import { checkAuth, logout, initDashboard } from './dashboard_modules/auth.js';
import { initializeUI } from './dashboard_modules/ui.js';
import { editPool, deletePool, editKey, rotateKey, deleteKey } from './dashboard_modules/handlers.js';

// 全局状态变量
let securityAuthenticated = false;
let generalSettings = {};

// 确保全局函数定义在window对象上，以便可以从HTML中调用
window.editPool = editPool;
window.deletePool = deletePool;
window.editKey = editKey;
window.rotateKey = rotateKey;
window.deleteKey = deleteKey;
window.logout = logout;

// 页面加载时执行初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 检查是否是从登出操作跳转来的
    if (window.location.search.includes('logout=')) {
        sessionStorage.clear();
        localStorage.clear();

        // 清除URL中的logout参数
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }

    // 检查认证状态
    checkAuth();

    // 初始化UI
    initializeUI();

    // 初始化仪表盘数据
    await initDashboard();
});

// 导出全局状态，供其他模块使用
export { securityAuthenticated, generalSettings };