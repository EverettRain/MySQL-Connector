// 全局状态变量
let securityAuthenticated = false;
let generalSettings = {};

// 初始化仪表盘 - 在页面加载时调用
async function initDashboard() {
    try {
        // 检查会话存储中的验证状态
        if (sessionStorage.getItem('securityAuthenticated') === 'true') {
            securityAuthenticated = true;
            console.log("从会话存储中恢复验证状态");
        } else {
            // 如果未验证，尝试获取验证状态
            const authResponse = await fetch('/api/v1/security/check-auth');
            if (authResponse.ok) {
                const authStatus = await authResponse.json();
                if (authStatus.authenticated) {
                    securityAuthenticated = true;
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

// 加载通用设置
async function loadGeneralSettings() {
    try {
        const response = await fetch('/api/v1/security/general-settings');
        if (response.ok) {
            generalSettings = await response.json();
        } else {
            console.error('无法加载通用设置');
        }
    } catch (error) {
        console.error('加载通用设置失败:', error);
    }
}

// 保存通用设置
function setupGeneralSettingsForm() {
    const saveButton = document.getElementById('saveGeneralSettings');
    if (saveButton) {
        saveButton.addEventListener('click', async function() {
            // 在这里实现保存通用设置的逻辑
            try {
                const response = await fetch('/api/v1/security/general-settings', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(generalSettings)
                });

                if (response.ok) {
                    alert('设置保存成功');
                } else {
                    alert('保存设置失败');
                }
            } catch (error) {
                console.error('保存设置失败:', error);
                alert('保存设置失败，请检查网络连接');
            }
        });
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
    if (typeof securityAuthenticated !== 'undefined') {
        securityAuthenticated = false;
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

// 模态框管理
const modals = {
    addPool: null,
    createKey: null,
    showKey: null,
    manageKey: null,
    changePassword: null
};

// 初始化模态框
function initModals() {
    const modalIds = {
        addPool: "addPoolModal",
        createKey: "createKeyModal",
        showKey: "showKeyModal",
        manageKey: "manageKeyModal",
        changePassword: "changePasswordModal"
    };

    for (const [key, id] of Object.entries(modalIds)) {
        const element = document.getElementById(id);
        if (element) {
            modals[key] = element;
        }
    }

    // 关闭按钮事件
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = "none";
            }
        });
    });

    // 点击模态框外区域关闭
    window.addEventListener('click', function(event) {
        Object.values(modals).forEach(modal => {
            if (modal && event.target === modal) {
                modal.style.display = "none";
            }
        });
    });
}

// 添加连接池相关
function setupAddPoolButton() {
    const addPoolButton = document.getElementById("addPoolButton");
    if (addPoolButton && modals.addPool) {
        addPoolButton.addEventListener('click', () => {
            modals.addPool.style.display = "block";
        });
    }

    const emptyAddPoolButton = document.getElementById('emptyAddPoolButton');
    if (emptyAddPoolButton && addPoolButton) {
        emptyAddPoolButton.addEventListener('click', function() {
            addPoolButton.click();
        });
    }
}

// API密钥相关
function setupApiKeyButtons() {
    const createKeyButton = document.getElementById("createKeyButton");
    if (createKeyButton && modals.createKey) {
        createKeyButton.addEventListener('click', () => {
            modals.createKey.style.display = "block";
        });
    }

    const emptyCreateKeyButton = document.getElementById('emptyCreateKeyButton');
    if (emptyCreateKeyButton && createKeyButton) {
        emptyCreateKeyButton.addEventListener('click', function() {
            createKeyButton.click();
        });
    }

    const closeKeyModalButton = document.getElementById('closeKeyModalButton');
    if (closeKeyModalButton && modals.showKey) {
        closeKeyModalButton.addEventListener('click', function() {
            modals.showKey.style.display = "none";
        });
    }

    const copyKeyButton = document.getElementById('copyKeyButton');
    const newKeyValue = document.getElementById('newKeyValue');
    if (copyKeyButton && newKeyValue) {
        copyKeyButton.addEventListener('click', function() {
            navigator.clipboard.writeText(newKeyValue.textContent || '')
                .then(() => {
                    this.textContent = "已复制!";
                    setTimeout(() => {
                        this.textContent = "复制";
                    }, 2000);
                })
                .catch(err => {
                    console.error('无法复制:', err);
                    alert('复制失败，请手动复制密钥');
                });
        });
    }
}

// 修改密码相关
function setupPasswordChangeButton() {
    const changePasswordButton = document.getElementById('changePasswordButton');
    if (changePasswordButton && modals.changePassword) {
        changePasswordButton.addEventListener('click', function() {
            modals.changePassword.style.display = "block";

            const passwordForm = document.getElementById('changePasswordForm');
            const passwordError = document.getElementById('passwordError');

            if (passwordForm) {
                passwordForm.reset();
            }

            if (passwordError) {
                passwordError.style.display = 'none';
            }
        });
    }
}

// 初始化表单提交处理
function setupFormSubmitHandlers() {
    // 添加连接池表单提交
    const addPoolForm = document.getElementById('addPoolForm');
    if (addPoolForm) {
        addPoolForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const formData = {
                id: document.getElementById('id')?.value || '',
                host: document.getElementById('host')?.value || '',
                port: parseInt(document.getElementById('port')?.value || '0'),
                user: document.getElementById('user')?.value || '',
                password: document.getElementById('password')?.value || '',
                database: document.getElementById('database')?.value || ''
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
                    if (modals.addPool) modals.addPool.style.display = "none";
                } else {
                    const error = await response.text();
                    alert(`连接池添加失败: ${error}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('请求失败，请检查控制台日志。');
            }
        });
    }

    // 创建API密钥表单提交
    const createKeyForm = document.getElementById('createKeyForm');
    if (createKeyForm) {
        createKeyForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const formData = {
                name: document.getElementById('keyName')?.value || '',
                description: document.getElementById('keyDescription')?.value || ''
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
                    const newKeyValue = document.getElementById('newKeyValue');
                    if (newKeyValue) {
                        newKeyValue.textContent = result.key;
                    }

                    this.reset();

                    if (modals.createKey) modals.createKey.style.display = "none";
                    if (modals.showKey) modals.showKey.style.display = "block";

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
    }

    // 管理API密钥表单提交
    const manageKeyForm = document.getElementById('manageKeyForm');
    if (manageKeyForm) {
        manageKeyForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const keyIdElement = document.getElementById('manageKeyId');
            const keyId = keyIdElement ? keyIdElement.value : '';

            const formData = {
                name: document.getElementById('manageKeyName')?.value || '',
                description: document.getElementById('manageKeyDescription')?.value || ''
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
                    if (modals.manageKey) modals.manageKey.style.display = "none";
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
    }

    // 密码修改表单提交
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            const currentPassword = document.getElementById('currentPassword')?.value || '';
            const newPassword = document.getElementById('newAdminPassword')?.value || '';
            const confirmPassword = document.getElementById('confirmAdminPassword')?.value || '';

            const errorElement = document.getElementById('passwordError');

            if (errorElement) {
                errorElement.style.display = 'none';
            }

            // 表单验证
            if (!currentPassword || !newPassword || !confirmPassword) {
                if (errorElement) {
                    errorElement.textContent = '所有字段都是必填的';
                    errorElement.style.display = 'block';
                }
                return;
            }

            if (newPassword.length < 6) {
                if (errorElement) {
                    errorElement.textContent = '新密码长度至少为6个字符';
                    errorElement.style.display = 'block';
                }
                return;
            }

            if (newPassword !== confirmPassword) {
                if (errorElement) {
                    errorElement.textContent = '两次输入的新密码不一致';
                    errorElement.style.display = 'block';
                }
                return;
            }

            if (currentPassword === newPassword) {
                if (errorElement) {
                    errorElement.textContent = '新密码不能与当前密码相同';
                    errorElement.style.display = 'block';
                }
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
                    if (modals.changePassword) modals.changePassword.style.display = "none";
                    alert('管理员密码修改成功');
                    this.reset();
                } else if (errorElement) {
                    errorElement.textContent = result.error || '密码修改失败';
                    errorElement.style.display = 'block';
                }
            } catch (error) {
                console.error('修改密码请求失败:', error);
                if (errorElement) {
                    errorElement.textContent = '请求失败，请检查网络连接';
                    errorElement.style.display = 'block';
                }
            }
        });
    }
}

// 按钮事件处理
function setupButtonHandlers() {
    // 轮换密钥按钮
    const rotateKeyButton = document.getElementById('rotateKeyButton');
    if (rotateKeyButton) {
        rotateKeyButton.addEventListener('click', async function() {
            const keyIdElement = document.getElementById('manageKeyId');
            if (!keyIdElement) return;

            const keyId = keyIdElement.value;

            try {
                const response = await fetch(`/api/v1/security/keys/${keyId}/rotate`, {
                    method: 'POST'
                });

                if (response.ok) {
                    const result = await response.json();
                    const newKeyValueElement = document.getElementById('newKeyValue');

                    if (newKeyValueElement) {
                        newKeyValueElement.textContent = result.key;
                    }

                    if (modals.manageKey) modals.manageKey.style.display = "none";
                    if (modals.showKey) modals.showKey.style.display = "block";

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
    }

    // 删除密钥按钮
    const deleteKeyButton = document.getElementById('deleteKeyButton');
    if (deleteKeyButton) {
        deleteKeyButton.addEventListener('click', async function() {
            if (!confirm('确定要删除此密钥吗？此操作不可撤销！')) {
                return;
            }

            const keyIdElement = document.getElementById('manageKeyId');
            if (!keyIdElement) return;

            const keyId = keyIdElement.value;

            try {
                const response = await fetch(`/api/v1/security/keys/${keyId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    alert('API密钥删除成功');
                    if (modals.manageKey) modals.manageKey.style.display = "none";
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
    }
}

// 切换主导航
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', async function(event) {
            event.preventDefault();

            const targetSection = this.getAttribute('data-section');
            if (!targetSection) return;

            // 正常切换界面
            document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));

            this.classList.add('active');

            const sectionElement = document.getElementById(targetSection + '-section');
            if (sectionElement) {
                sectionElement.classList.add('active');
            }

            // 如果切换到安全管理
            if (targetSection === 'security') {
                // 确保通用设置标签是活动的，并加载设置
                document.querySelectorAll('.security-link').forEach(el => el.classList.remove('active'));
                document.querySelectorAll('.security-subsection').forEach(el => el.classList.remove('active'));

                const generalLink = document.querySelector('.security-link[data-section="general"]');
                if (generalLink) {
                    generalLink.classList.add('active');

                    const generalSection = document.getElementById('general-section');
                    if (generalSection) {
                        generalSection.classList.add('active');
                    }

                    loadGeneralSettings();
                }
            }
        });
    });

    // 切换安全管理子导航
    document.querySelectorAll('.security-link').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();

            const targetSection = this.getAttribute('data-section');
            if (!targetSection) return;

            // 移除所有活动状态
            document.querySelectorAll('.security-link').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.security-subsection').forEach(el => el.classList.remove('active'));

            // 添加当前活动状态
            this.classList.add('active');

            const sectionElement = document.getElementById(targetSection + '-section');
            if (sectionElement) {
                sectionElement.classList.add('active');
            }

            if (targetSection === 'keys') {
                loadApiKeys(); // 加载API密钥列表
            } else if (targetSection === 'general') {
                loadGeneralSettings(); // 加载通用设置
            }
        });
    });
}

// 加载连接池列表
function loadPools() {
    return fetch('/api/v1/pools')
        .then(response => {
            if (!response.ok) {
                throw new Error(`加载连接池失败: ${response.status}`);
            }
            return response.json();
        })
        .then(pools => {
            const poolsList = document.getElementById('poolsList');
            const poolsTable = document.getElementById('poolsTable');
            const emptyState = document.getElementById('emptyPoolsState');

            if (!poolsList || !poolsTable || !emptyState) {
                console.error('找不到连接池相关DOM元素');
                return;
            }

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

// 加载API密钥列表
function loadApiKeys() {
    return fetch('/api/v1/security/keys')
        .then(response => {
            if (!response.ok) {
                throw new Error(`加载API密钥失败: ${response.status}`);
            }
            return response.json();
        })
        .then(keys => {
            const keysList = document.getElementById('keysList');
            const keysTable = document.getElementById('keysTable');
            const emptyState = document.getElementById('emptyKeysState');

            if (!keysList || !keysTable || !emptyState) {
                console.error('找不到API密钥相关DOM元素');
                return;
            }

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

// 编辑API密钥
function editKey(keyId) {
    fetch('/api/v1/security/keys')
        .then(response => {
            if (!response.ok) {
                throw new Error('获取密钥列表失败');
            }
            return response.json();
        })
        .then(keys => {
            const key = keys.find(k => k.id === keyId);

            if (!key) {
                throw new Error('找不到指定的密钥');
            }

            const keyIdElement = document.getElementById('manageKeyId');
            const keyNameElement = document.getElementById('manageKeyName');
            const keyDescElement = document.getElementById('manageKeyDescription');

            if (keyIdElement) keyIdElement.value = key.id;
            if (keyNameElement) keyNameElement.value = key.name;
            if (keyDescElement) keyDescElement.value = key.description || '';

            if (modals.manageKey) {
                modals.manageKey.style.display = "block";
            }
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
            const newKeyValueElement = document.getElementById('newKeyValue');
            if (newKeyValueElement) {
                newKeyValueElement.textContent = result.key;
            }

            if (modals.showKey) {
                modals.showKey.style.display = "block";
            }

            loadApiKeys();
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
            loadApiKeys();
        })
        .catch(error => {
            console.error('删除密钥失败:', error);
            alert(error.message || '删除密钥失败，请检查控制台日志');
        });
}

// 编辑连接池
function editPool(poolId) {
    window.location.href = `../database/database.html?poolId=${poolId}`;
}

// 删除连接池
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
            loadPools();
        })
        .catch(error => {
            console.error('删除连接池失败:', error);
            alert(error.message || '删除连接池失败，请检查控制台日志');
        });
}

// 页面加载时立即检查认证状态
(function checkAuth() {
    // 检查认证状态
    const isAuthenticated = sessionStorage.getItem('securityAuthenticated') === 'true';

    if (!isAuthenticated) {
        console.log("未认证，重定向到登录页面");
        window.location.replace('/login');  // 使用replace而不是href，防止回退
        return;  // 阻止页面继续加载
    }
})();

// 初始化函数：设置所有事件监听器和初始状态
function initializeUI() {
    initModals();
    setupNavigation();
    setupAddPoolButton();
    setupApiKeyButtons();
    setupPasswordChangeButton();
    setupFormSubmitHandlers();
    setupButtonHandlers();
    setupGeneralSettingsForm();
}

// 确保全局函数定义在window对象上，以便可以从HTML中调用
window.editPool = editPool;
window.deletePool = deletePool;
window.editKey = editKey;
window.rotateKey = rotateKey;
window.deleteKey = deleteKey;
window.logout = logout;

// 页面加载时执行初始化
document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.search.includes('logout=')) {
        sessionStorage.clear();
        localStorage.clear();

        // 清除URL中的logout参数
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
    
    initializeUI();
    await initDashboard();
});