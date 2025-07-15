import { loadPools, loadApiKeys, loadGeneralSettings } from './api.js';

// 检查认证状态
function checkAuth() {
    // 检查认证状态
    const isAuthenticated = sessionStorage.getItem('securityAuthenticated') === 'true';

    if (!isAuthenticated) {
        console.log("未认证，重定向到登录页面");
        window.location.replace('/login');  // 使用replace而不是href，防止回退
        return false;  // 阻止页面继续加载
    }
    return true;
}

// 初始化仪表盘 - 在页面加载时调用
async function initDashboard() {
    try {
        // 检查会话存储中的验证状态
        if (sessionStorage.getItem('securityAuthenticated') === 'true') {
            window.securityAuthenticated = true;
            console.log("从会话存储中恢复验证状态");
        } else {
            // 如果未验证，尝试获取验证状态
            const authResponse = await fetch('/api/v1/security/check-auth');
            if (authResponse.ok) {
                const authStatus = await authResponse.json();
                if (authStatus.authenticated) {
                    window.securityAuthenticated = true;
                    sessionStorage.setItem('securityAuthenticated', 'true');
                } else {
                    // 未验证，重定向到登录页面
                    window.location.href = '/login';
                    return;
                }
            } else {
                // 请求失败，重定向到登录页面
                window.location.href = '/login';
                return;
            }
        }

        // 加载数据
        await loadPools();
        loadApiKeys();
        loadGeneralSettings();
    } catch (error) {
        console.error("初始化仪表盘失败:", error);
        window.location.href = '/login';
    }
}

// 登出函数
function logout() {
    if (!confirm('确定要登出吗？你将需要重新登陆才能进入管理界面')) {
        return;
    }

    // 1. 清除本地存储的认证状态
    sessionStorage.removeItem('securityAuthenticated');
    localStorage.removeItem('securityAuthenticated'); // 同时清除localStorage，以防万一

    // 2. 更新内存中的认证状态
    if (typeof window.securityAuthenticated !== 'undefined') {
        window.securityAuthenticated = false;
    }

    // 3. 清除可能存在的其他会话相关数据
    sessionStorage.clear(); // 清除所有会话存储

    // 4. 向服务器发送登出请求，销毁服务器端会话
    fetch('/api/v1/security/logout', {
        method: 'POST',
        credentials: 'same-origin', // 确保发送cookies
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => {
        if (!response.ok) {
            throw new Error('服务器登出失败');
        }
        return response.json();
    }).then(() => {
        // 5. 重定向到登录页面，添加参数防止缓存和回退
        window.location.href = '/login?logout=' + new Date().getTime();
    }).catch(error => {
        console.error('登出请求失败:', error);
        // 即使请求失败，仍然重定向到登录页面
        window.location.href = '/login?logout=' + new Date().getTime();
    });

    // 6. 防止用户使用浏览器后退按钮返回到已登出的页面
    window.history.pushState(null, '', '/login');
}

export { checkAuth, initDashboard, logout };