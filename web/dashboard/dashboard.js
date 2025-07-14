let securityAuthenticated = false;
let generalSettings = { useGlobalPassword: false };
const passwordOverlay = document.getElementById('passwordOverlay');

function checkSecuritySection() {
    // 如果安全管理界面是活动的，但用户未通过验证，则强制切换到数据库管理
    const securitySection = document.getElementById('security-section');

    // 检查会话存储中的验证状态
    if (sessionStorage.getItem('securityAuthenticated') === 'true') {
        securityAuthenticated = true;
    }
    
    if (securitySection.classList.contains('active') && !securityAuthenticated) {
        // 切换到数据库管理界面
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));

        document.querySelector('.nav-link[data-section="database"]').classList.add('active');
        document.getElementById('database-section').classList.add('active');

        // 显示验证模态框
        checkSecurityAccess();
    }
}

// 初始化函数 - 在页面加载时调用
async function initDashboard() {
    // 检查会话存储中的验证状态
    if (sessionStorage.getItem('securityAuthenticated') === 'true') {
        securityAuthenticated = true;
        console.log("从会话存储中恢复验证状态");
    }
    
    // 加载连接池
    await loadPools();

    // 检查是否启用了全局密码
    try {
        const response = await fetch('/api/v1/security/general-settings');
        if (response.ok) {
            generalSettings = await response.json();

            // 如果启用了全局密码且尚未验证，则检查访问权限
            if (generalSettings.useGlobalPassword && !securityAuthenticated) {
                checkSecurityAccess();
            }
        }
    } catch (error) {
        console.error('获取通用设置失败:', error);
    }
}

// 加载通用设置
async function loadGeneralSettings() {
    try {
        const response = await fetch('/api/v1/security/general-settings');
        if (response.ok) {
            generalSettings = await response.json();

            // 更新开关状态
            document.getElementById('globalPasswordSwitch').checked = generalSettings.useGlobalPassword;
        } else {
            console.error('无法加载通用设置');
        }
    } catch (error) {
        console.error('加载通用设置失败:', error);
    }
}

// 保存通用设置
document.getElementById('saveGeneralSettings').addEventListener('click', async function() {
    const useGlobalPassword = document.getElementById('globalPasswordSwitch').checked;

    try {
        const response = await fetch('/api/v1/security/general-settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ useGlobalPassword })
        });

        if (response.ok) {
            alert('设置已保存');
            generalSettings.useGlobalPassword = useGlobalPassword;
        } else {
            const error = await response.json();
            alert(`保存设置失败: ${error.error}`);
        }
    } catch (error) {
        console.error('保存设置失败:', error);
        alert('请求失败，请检查控制台日志。');
    }
});

// 切换主导航
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', async function(event) {
        event.preventDefault();

        const targetSection = this.getAttribute('data-section');

        // 如果启用了全局密码且尚未验证，检查访问权限
        if (generalSettings.useGlobalPassword && !securityAuthenticated) {
            checkSecurityAccess();
            return;
        }

        // 如果点击的是安全管理，并且尚未通过验证，且未启用全局密码，则检查访问权限
        if (targetSection === 'security' && !securityAuthenticated && !generalSettings.useGlobalPassword) {
            checkSecurityAccess();
            return;
        }

        // 否则正常切换界面
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));

        this.classList.add('active');
        document.getElementById(targetSection + '-section').classList.add('active');

        // 如果切换到安全管理且已验证
        if (targetSection === 'security' && securityAuthenticated) {
            // 确保通用设置标签是活动的，并加载设置
            document.querySelectorAll('.security-link').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.security-subsection').forEach(el => el.classList.remove('active'));

            const generalLink = document.querySelector('.security-link[data-section="general"]');
            if (generalLink) {
                generalLink.classList.add('active');
                document.getElementById('general-section').classList.add('active');
                loadGeneralSettings();
            }
        }
    });
});

window.addEventListener('load', checkSecuritySection);
document.addEventListener('DOMContentLoaded', initDashboard);
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化仪表盘
    await initDashboard();

    // 如果启用了全局密码且尚未验证，显示遮罩并检查访问权限
    if (generalSettings.useGlobalPassword && !securityAuthenticated) {
        passwordOverlay.style.display = 'block';
        checkSecurityAccess();
    }
});

// 切换安全管理子导航
document.querySelectorAll('.security-link').forEach(link => {
    link.addEventListener('click', function(event) {
        event.preventDefault();

        // 移除所有活动状态
        document.querySelectorAll('.security-link').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.security-subsection').forEach(el => el.classList.remove('active'));

        // 添加当前活动状态
        this.classList.add('active');
        const targetSection = this.getAttribute('data-section');
        document.getElementById(targetSection + '-section').classList.add('active');

        if (targetSection === 'keys') {
            loadApiKeys(); // 加载API密钥列表
        } else if (targetSection === 'general') {
            loadGeneralSettings(); // 加载通用设置
        }
    });
});

// 模态框管理
const modals = {
    addPool: document.getElementById("addPoolModal"),
    createKey: document.getElementById("createKeyModal"),
    showKey: document.getElementById("showKeyModal"),
    manageKey: document.getElementById("manageKeyModal"),
    setPassword: document.getElementById("setPasswordModal"),
    verifyPassword: document.getElementById("verifyPasswordModal"),
    changePassword: document.getElementById("changePasswordModal")
};

// 检查是否需要设置密码或验证密码
function checkSecurityAccess() {
    // 记录用户想要访问的部分
    const targetSection = document.querySelector('.nav-link.active').getAttribute('data-section');

    // 在验证表单上添加目标信息
    document.getElementById('verifyPasswordForm').setAttribute('data-target-section', targetSection);

    // 如果启用了全局密码，显示遮罩
    if (generalSettings.useGlobalPassword) {
        passwordOverlay.style.display = 'block';
    }

    fetch('/api/v1/security/has-password')
        .then(response => response.json())
        .then(data => {
            if (data.hasPassword) {
                // 如果已设置密码，则显示验证密码模态框
                modals.verifyPassword.style.display = "block";
            } else {
                // 如果未设置密码，则显示设置密码模态框
                modals.setPassword.style.display = "block";
            }
        })
        .catch(error => {
            console.error('检查密码失败:', error);
        });
}

// 设置密码表单提交
document.getElementById('setPasswordForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // 检查两次密码是否匹配
    if (newPassword !== confirmPassword) {
        document.getElementById('passwordMismatch').style.display = "block";
        return;
    }

    document.getElementById('passwordMismatch').style.display = "none";

    try {
        const response = await fetch('/api/v1/security/set-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: newPassword })
        });

        if (response.ok) {
            // 设置密码成功，关闭模态框并允许访问安全管理
            modals.setPassword.style.display = "none";
            securityAuthenticated = true;

            // 将验证状态存储在会话存储中
            sessionStorage.setItem('securityAuthenticated', 'true');

            // 切换到安全管理界面
            document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));

            document.querySelector('.nav-link[data-section="security"]').classList.add('active');
            document.getElementById('security-section').classList.add('active');

            alert('管理密码设置成功');

            // 加载API密钥列表 - 确保在设置密码成功后加载
            loadApiKeys();
        } else {
            const error = await response.json();
            alert(`设置管理密码失败: ${error.error}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('请求失败，请检查控制台日志。');
    }
});

function logout() {
    // 清除会话存储中的验证状态
    sessionStorage.removeItem('securityAuthenticated');
    securityAuthenticated = false;

    // 调用后端登出API
    fetch('/api/v1/security/logout', {
        method: 'POST'
    }).then(() => {
        // 切换到数据库管理界面
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));

        document.querySelector('.nav-link[data-section="database"]').classList.add('active');
        document.getElementById('database-section').classList.add('active');
    }).catch(error => {
        console.error('登出失败:', error);
    });
}

// 验证密码表单提交
document.getElementById('verifyPasswordForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const password = document.getElementById('verifyPasswordInput').value;
    console.log("提交密码验证, 密码长度:", password.length);

    if (!password || password.trim() === '') {
        alert('请输入密码');
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
            // 验证密码成功，关闭模态框并允许访问
            modals.verifyPassword.style.display = "none";
            passwordOverlay.style.display = 'none';
            securityAuthenticated = true;

            // 将验证状态存储在会话存储中
            sessionStorage.setItem('securityAuthenticated', 'true');

            // 重置表单和错误消息
            this.reset();
            document.getElementById('passwordIncorrect').style.display = "none";

            // 获取目标部分（如果存在）
            const targetSection = this.getAttribute('data-target-section') || 'database';

            // 切换到目标部分
            document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));

            document.querySelector(`.nav-link[data-section="${targetSection}"]`).classList.add('active');
            document.getElementById(`${targetSection}-section`).classList.add('active');

            // 如果目标是安全管理，则加载安全管理内容
            if (targetSection === 'security') {
                // 切换到通用设置页面
                document.querySelectorAll('.security-link').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.security-subsection').forEach(el => el.classList.remove('active'));
    
                const generalLink = document.querySelector('.security-link[data-section="general"]');
                if (generalLink) {
                    generalLink.classList.add('active');
                    document.getElementById('general-section').classList.add('active');
                    loadGeneralSettings();
                }
            }
        } else {
            // 显示密码不正确的错误消息
            document.getElementById('passwordIncorrect').style.display = "block";
        }
    } catch (error) {
        console.error('请求失败:', error);
        alert('请求失败，请检查控制台日志。');
    }
});

// 打开模态框的按钮
document.getElementById("addPoolButton").addEventListener('click', () => {
    modals.addPool.style.display = "block";
});

document.getElementById("createKeyButton").addEventListener('click', () => {
    modals.createKey.style.display = "block";
});

// 关闭按钮事件
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', function() {
        this.closest('.modal').style.display = "none";
    });
});

// 点击模态框外区域关闭
window.addEventListener('click', function(event) {
    // 对于密码验证模态框，不允许点击外部关闭
    if (event.target === modals.verifyPassword || event.target === modals.setPassword) {
        // 不执行任何操作，保持模态框打开
        return;
    }

    // 对于其他模态框，允许点击外部关闭
    Object.values(modals).forEach(modal => {
        if (event.target === modal &&
            modal !== modals.verifyPassword &&
            modal !== modals.setPassword) {
            modal.style.display = "none";
        }
    });
});

document.getElementById('closeKeyModalButton').addEventListener('click', function() {
    modals.showKey.style.display = "none";
});

// 复制新密钥到剪贴板
document.getElementById('copyKeyButton').addEventListener('click', function() {
    const keyValue = document.getElementById('newKeyValue').textContent;
    navigator.clipboard.writeText(keyValue)
        .then(() => {
            this.textContent = "已复制!";
            setTimeout(() => {
                this.textContent = "复制";
            }, 2000);
        })
        .catch(err => {
            console.error('无法复制: ', err);
            alert('复制失败，请手动复制密钥');
        });
});

// 添加连接池表单提交
document.getElementById('addPoolForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = {
        id: document.getElementById('id').value,
        host: document.getElementById('host').value,
        port: parseInt(document.getElementById('port').value),
        user: document.getElementById('user').value,
        password: document.getElementById('password').value,
        database: document.getElementById('database').value
    };

    try {
        const response = await fetch('/add-pool', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            alert('连接池添加成功！');
            loadPools();
            this.reset();
            modals.addPool.style.display = "none";
        } else {
            const error = await response.text();
            alert(`连接池添加失败: ${error}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('请求失败，请检查控制台日志。');
    }
});

// 创建API密钥表单提交
document.getElementById('createKeyForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = {
        name: document.getElementById('keyName').value,
        description: document.getElementById('keyDescription').value
    };

    try {
        const response = await fetch('/api/v1/security/keys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            const result = await response.json();
            // 显示新密钥
            document.getElementById('newKeyValue').textContent = result.key;
            this.reset();
            modals.createKey.style.display = "none";
            modals.showKey.style.display = "block";
            loadApiKeys();
        } else {
            const error = await response.text();
            alert(`创建API密钥失败: ${error}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('请求失败，请检查控制台日志。');
    }
});

// 管理API密钥表单提交（更新名称和描述）
document.getElementById('manageKeyForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const keyId = document.getElementById('manageKeyId').value;
    const formData = {
        name: document.getElementById('manageKeyName').value,
        description: document.getElementById('manageKeyDescription').value
    };

    try {
        const response = await fetch(`/api/v1/security/keys/${keyId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            alert('API密钥信息更新成功');
            modals.manageKey.style.display = "none";
            loadApiKeys();
        } else {
            const error = await response.json();
            alert(`更新API密钥失败: ${error.error}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('请求失败，请检查控制台日志。');
    }
});

// 轮换密钥按钮
document.getElementById('rotateKeyButton').addEventListener('click', async function() {
    const keyId = document.getElementById('manageKeyId').value;

    try {
        const response = await fetch(`/api/v1/security/keys/${keyId}/rotate`, {
            method: 'POST'
        });

        if (response.ok) {
            const result = await response.json();
            // 显示新密钥
            document.getElementById('newKeyValue').textContent = result.key;
            modals.manageKey.style.display = "none";
            modals.showKey.style.display = "block";
            loadApiKeys();
        } else {
            const error = await response.text();
            alert(`轮换API密钥失败: ${error}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('请求失败，请检查控制台日志。');
    }
});

// 删除密钥按钮
document.getElementById('deleteKeyButton').addEventListener('click', async function() {
    if (!confirm('确定要删除此密钥吗？此操作不可撤销！')) {
        return;
    }

    const keyId = document.getElementById('manageKeyId').value;

    try {
        const response = await fetch(`/api/v1/security/keys/${keyId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('API密钥删除成功');
            modals.manageKey.style.display = "none";
            loadApiKeys();
        } else {
            const error = await response.text();
            alert(`删除API密钥失败: ${error}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('请求失败，请检查控制台日志。');
    }
});

// 修改密码按钮点击事件
document.getElementById('changePasswordButton').addEventListener('click', function() {
    // 显示修改密码模态框
    modals.changePassword.style.display = "block";

    // 重置表单和错误消息
    document.getElementById('changePasswordForm').reset();
    document.getElementById('passwordError').style.display = 'none';
});

// 修改密码表单提交处理
document.getElementById('changePasswordForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newAdminPassword').value;
    const confirmPassword = document.getElementById('confirmAdminPassword').value;

    // 重置错误消息
    const errorElement = document.getElementById('passwordError');
    errorElement.style.display = 'none';

    // 表单验证
    if (!currentPassword || !newPassword || !confirmPassword) {
        errorElement.textContent = '所有字段都是必填的';
        errorElement.style.display = 'block';
        return;
    }

    if (newPassword.length < 6) {
        errorElement.textContent = '新密码长度至少为6个字符';
        errorElement.style.display = 'block';
        return;
    }

    if (newPassword !== confirmPassword) {
        errorElement.textContent = '两次输入的新密码不一致';
        errorElement.style.display = 'block';
        return;
    }

    if (currentPassword === newPassword) {
        errorElement.textContent = '新密码不能与当前密码相同';
        errorElement.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/api/v1/security/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // 密码修改成功，关闭模态框
            modals.changePassword.style.display = "none";

            // 显示成功提示
            alert('管理员密码修改成功');

            // 清空表单
            this.reset();
        } else {
            // 显示错误消息
            errorElement.textContent = result.error || '密码修改失败';
            errorElement.style.display = 'block';
        }
    } catch (error) {
        console.error('修改密码请求失败:', error);
        errorElement.textContent = '请求失败，请检查网络连接';
        errorElement.style.display = 'block';
    }
});

// 点击模态框外部关闭模态框
window.addEventListener('click', function(event) {
    if (event.target === modals.changePassword) {
        modals.changePassword.style.display = "none";
    }
});

document.getElementById('backToDatabaseButton').addEventListener('click', function() {
    // 关闭验证模态框
    modals.verifyPassword.style.display = "none";
    passwordOverlay.style.display = 'none';

    // 切换到数据库管理界面
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));

    document.querySelector('.nav-link[data-section="database"]').classList.add('active');
    document.getElementById('database-section').classList.add('active');
});

// 加载连接池列表
function loadPools() {
    fetch('/api/v1/pools')
        .then(response => response.json())
        .then(pools => {
            const poolsList = document.getElementById('poolsList');
            const poolsTable = document.getElementById('poolsTable');
            const emptyState = document.getElementById('emptyPoolsState');

            // 清空当前列表
            poolsList.innerHTML = '';

            if (pools && pools.length > 0) {
                // 显示表格，隐藏空状态
                poolsTable.style.display = 'table';
                emptyState.style.display = 'none';

                // 为每个连接池创建表格行
                pools.forEach(pool => {
                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td class="pool-id">${pool.id}</td>
                        <td class="pool-database">${pool.database}</td>
                        <td class="pool-host">${pool.host}:${pool.port} (${pool.user})</td>
                        <td class="actions">
                            <button class="action-button edit-button" onclick="editPool('${pool.id}')">编辑</button>
                            <button class="action-button delete-button" onclick="deletePool('${pool.id}')">删除</button>
                        </td>
                    `;

                    poolsList.appendChild(row);
                });
            } else {
                // 隐藏表格，显示空状态
                poolsTable.style.display = 'none';
                emptyState.style.display = 'flex';
            }
        })
        .catch(error => {
            console.error('加载连接池失败:', error);
        });
}

// 确保空状态的添加按钮也能工作
document.getElementById('emptyAddPoolButton').addEventListener('click', function() {
    document.getElementById('addPoolButton').click();
});

// 编辑API密钥
function editKey(keyId) {
    // 从已加载的密钥列表中查找密钥信息
    fetch('/api/v1/security/keys')
        .then(response => {
            if (!response.ok) {
                throw new Error('获取密钥列表失败');
            }
            return response.json();
        })
        .then(keys => {
            // 查找指定ID的密钥
            const key = keys.find(k => k.id === keyId);

            if (!key) {
                throw new Error('找不到指定的密钥');
            }

            // 填充表单数据
            document.getElementById('manageKeyId').value = key.id;
            document.getElementById('manageKeyName').value = key.name;
            document.getElementById('manageKeyDescription').value = key.description || '';

            // 显示管理模态框
            modals.manageKey.style.display = "block";
        })
        .catch(error => {
            console.error('编辑密钥失败:', error);
            alert('获取密钥信息失败');
        });
}

// 轮换API密钥
function rotateKey(keyId) {
    if (!confirm('确定要轮换此API密钥吗？此操作将会使当前密钥失效，并生成新的密钥。')) {
        return;
    }

    fetch(`/api/v1/security/keys/${keyId}/rotate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || '轮换密钥失败');
                });
            }
            return response.json();
        })
        .then(result => {
            // 显示新密钥
            document.getElementById('newKeyValue').textContent = result.key;
            modals.showKey.style.display = "block";
            loadApiKeys(); // 重新加载密钥列表
        })
        .catch(error => {
            console.error('轮换密钥失败:', error);
            alert(error.message || '轮换密钥失败，请检查控制台日志');
        });
}

// 删除API密钥
function deleteKey(keyId) {
    if (!confirm('确定要删除此API密钥吗？此操作不可撤销！')) {
        return;
    }

    fetch(`/api/v1/security/keys/${keyId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || '删除密钥失败');
                });
            }
            return response.json();
        })
        .then(() => {
            alert('API密钥删除成功');
            loadApiKeys(); // 重新加载密钥列表
        })
        .catch(error => {
            console.error('删除密钥失败:', error);
            alert(error.message || '删除密钥失败，请检查控制台日志');
        });
}

function editPool(poolId) {
    // 重定向到数据库详情页面
    window.location.href = `../database/database.html?poolId=${poolId}`;
}

// 删除连接池函数
function deletePool(poolId) {
    if (!confirm(`确定要删除连接池 "${poolId}" 吗？此操作不可撤销！`)) {
        return;
    }

    fetch(`/api/v1/pools/${poolId}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text || '删除连接池失败');
                });
            }

            alert('连接池删除成功');
            loadPools(); // 重新加载连接池列表
        })
        .catch(error => {
            console.error('删除连接池失败:', error);
            alert(error.message || '删除连接池失败，请检查控制台日志');
        });
}

// 加载API密钥列表
function loadApiKeys() {
    fetch('/api/v1/security/keys')
        .then(response => {
            if (!response.ok) {
                throw new Error('加载API密钥失败');
            }
            return response.json();
        })
        .then(keys => {
            const keysList = document.getElementById('keysList');
            const keysTable = document.getElementById('keysTable');
            const emptyState = document.getElementById('emptyKeysState');

            // 清空当前列表
            keysList.innerHTML = '';

            if (keys && keys.length > 0) {
                // 显示表格，隐藏空状态
                keysTable.style.display = 'table';
                emptyState.style.display = 'none';

                // 为每个API密钥创建表格行
                keys.forEach(key => {
                    const row = document.createElement('tr');
                    const createdDate = new Date(key.created).toLocaleString();

                    row.innerHTML = `
                        <td class="key-name">${key.name}</td>
                        <td class="key-id">${key.id}</td>
                        <td class="key-description">${key.description || '无描述'}</td>
                        <td class="key-date">${createdDate}</td>
                        <td class="actions">
                            <button class="action-button edit-button" onclick="editKey('${key.id}')">编辑</button>
                            <button class="action-button rotate-button" onclick="rotateKey('${key.id}')">轮换</button>
                            <button class="action-button delete-button" onclick="deleteKey('${key.id}')">删除</button>
                        </td>
                    `;

                    keysList.appendChild(row);
                });
            } else {
                // 隐藏表格，显示空状态
                keysTable.style.display = 'none';
                emptyState.style.display = 'flex';
            }
        })
        .catch(error => {
            console.error('无法加载API密钥列表', error);
        });
}

// 确保空状态的创建按钮也能工作
document.getElementById('emptyCreateKeyButton').addEventListener('click', function() {
    document.getElementById('createKeyButton').click();
});

// 页面加载完成后加载数据
window.onload = function() {
    loadPools();
    loadApiKeys();
};
