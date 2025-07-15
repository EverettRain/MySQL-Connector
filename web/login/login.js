document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    checkLoginStatus();
    
    // 检查是否已设置密码
    checkPasswordStatus();

    // 验证密码表单提交
    setupVerifyPasswordForm();

    // 设置密码表单提交
    setupSetPasswordForm();

    // 检查是否为登出操作跳转
    handleLogoutRedirect();
});

function checkLoginStatus() {
    // 首先检查客户端存储中的登录状态
    const isAuthenticated = sessionStorage.getItem('securityAuthenticated') === 'true';

    if (isAuthenticated) {
        console.log("检测到已登录状态，重定向到仪表盘");
        window.location.replace('/dashboard');
        return;
    }

    // 如果客户端存储没有登录状态，向服务器确认
    fetch('/api/v1/security/check-auth', {
        method: 'GET',
        credentials: 'same-origin', // 确保发送cookies
        cache: 'no-cache'
    })
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                console.log("服务器确认已登录，重定向到仪表盘");
                // 更新客户端存储
                sessionStorage.setItem('securityAuthenticated', 'true');
                window.location.replace('/dashboard');
            } else {
                console.log("未登录，显示登录界面");
                // 确保登录表单可见
                document.querySelector('.login-container').style.visibility = 'visible';
            }
        })
        .catch(error => {
            console.error("检查登录状态失败:", error);
            // 出错时默认显示登录界面
            document.querySelector('.login-container').style.visibility = 'visible';
        });
}

function handleLogoutRedirect() {
    if (window.location.search.includes('logout=')) {
        // 清除URL参数
        window.history.replaceState({}, document.title, window.location.pathname);

        // 防止通过浏览器回退按钮返回到已登出的页面
        window.history.pushState(null, '', window.location.pathname);
        window.addEventListener('popstate', function() {
            window.history.forward();
        });
    }
}

function checkPasswordStatus() {
    fetch('/api/v1/security/has-password')
        .then(response => response.json())
        .then(data => {
            if (data.hasPassword) {
                // 已设置密码，显示登录表单
                document.getElementById('loginForm').style.display = 'block';
                document.getElementById('setupForm').style.display = 'none';
            } else {
                // 未设置密码，显示设置密码表单
                document.getElementById('loginForm').style.display = 'none';
                document.getElementById('setupForm').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('检查密码状态失败:', error);
            showError('无法连接到服务器，请检查网络连接');
        });
}

function setupVerifyPasswordForm() {
    document.getElementById('verifyPasswordForm').addEventListener('submit', async function(event) {
        event.preventDefault();

        const password = document.getElementById('verifyPasswordInput').value;

        if (!password || password.trim() === '') {
            showError('请输入密码');
            return;
        }

        try {
            const response = await fetch('/api/v1/security/verify-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            const result = await response.json();

            if (result.valid) {
                // 验证成功，重定向到仪表盘
                sessionStorage.setItem('securityAuthenticated', 'true');
                window.location.href = '/dashboard';
            } else {
                // 显示错误消息
                document.getElementById('passwordIncorrect').style.display = 'block';
            }
        } catch (error) {
            console.error('请求失败:', error);
            showError('请求失败，请检查网络连接');
        }
    });
}

function setupSetPasswordForm() {
    document.getElementById('setPasswordForm').addEventListener('submit', async function(event) {
        event.preventDefault();

        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // 检查密码长度
        if (newPassword.length < 6) {
            showError('密码长度至少需要6个字符');
            return;
        }

        // 检查两次密码是否匹配
        if (newPassword !== confirmPassword) {
            document.getElementById('passwordMismatch').style.display = 'block';
            return;
        }

        document.getElementById('passwordMismatch').style.display = 'none';

        try {
            const response = await fetch('/api/v1/security/set-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: newPassword })
            });

            if (response.ok) {
                // 设置密码成功，设置会话状态并重定向到仪表盘
                sessionStorage.setItem('securityAuthenticated', 'true');
                window.location.href = '/dashboard';
            } else {
                const error = await response.json();
                showError(`设置管理密码失败: ${error.error || '未知错误'}`);
            }
        } catch (error) {
            console.error('请求失败:', error);
            showError('请求失败，请检查网络连接');
        }
    });
}

function showError(message) {
    // 创建一个通用的错误提示
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.style.display = 'block';
    errorElement.textContent = message;

    // 移除任何现有的通用错误提示
    document.querySelectorAll('.error-message.general-error').forEach(el => el.remove());

    // 添加通用错误类
    errorElement.classList.add('general-error');

    // 插入到表单前面
    const activeForm = document.getElementById('loginForm').style.display === 'block'
        ? document.getElementById('verifyPasswordForm')
        : document.getElementById('setPasswordForm');

    activeForm.insertBefore(errorElement, activeForm.firstChild);

    // 3秒后自动消失
    setTimeout(() => {
        errorElement.remove();
    }, 3000);
}