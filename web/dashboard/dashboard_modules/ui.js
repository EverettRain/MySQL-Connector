import { initModals } from './modals.js';
import { setupNavigation } from './navigation.js';
import {saveGeneralSettings, loadApiKeys, loadPools, saveUserSettings, loadUserSettings} from './api.js';

// 添加连接池相关
function setupAddPoolButton() {
    const addPoolButton = document.getElementById("addPoolButton");
    const modals = document.querySelectorAll('.modal');
    const addPoolModal = document.getElementById("addPoolModal");

    if (addPoolButton && addPoolModal) {
        addPoolButton.addEventListener('click', () => {
            addPoolModal.style.display = "block";
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
    const createKeyModal = document.getElementById("createKeyModal");
    const showKeyModal = document.getElementById("showKeyModal");

    if (createKeyButton && createKeyModal) {
        createKeyButton.addEventListener('click', () => {
            createKeyModal.style.display = "block";
        });
    }

    const emptyCreateKeyButton = document.getElementById('emptyCreateKeyButton');
    if (emptyCreateKeyButton && createKeyButton) {
        emptyCreateKeyButton.addEventListener('click', function() {
            createKeyButton.click();
        });
    }

    const closeKeyModalButton = document.getElementById('closeKeyModalButton');
    if (closeKeyModalButton && showKeyModal) {
        closeKeyModalButton.addEventListener('click', function() {
            showKeyModal.style.display = "none";
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
    const changePasswordModal = document.getElementById('changePasswordModal');

    if (changePasswordButton && changePasswordModal) {
        changePasswordButton.addEventListener('click', function() {
            changePasswordModal.style.display = "block";

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
                    const addPoolModal = document.getElementById("addPoolModal");
                    if (addPoolModal) addPoolModal.style.display = "none";
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

                    const createKeyModal = document.getElementById("createKeyModal");
                    const showKeyModal = document.getElementById("showKeyModal");
                    if (createKeyModal) createKeyModal.style.display = "none";
                    if (showKeyModal) showKeyModal.style.display = "block";

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
                    const manageKeyModal = document.getElementById("manageKeyModal");
                    if (manageKeyModal) manageKeyModal.style.display = "none";
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
                    const changePasswordModal = document.getElementById("changePasswordModal");
                    if (changePasswordModal) changePasswordModal.style.display = "none";
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

                    const manageKeyModal = document.getElementById("manageKeyModal");
                    const showKeyModal = document.getElementById("showKeyModal");
                    if (manageKeyModal) manageKeyModal.style.display = "none";
                    if (showKeyModal) showKeyModal.style.display = "block";

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
                    const manageKeyModal = document.getElementById("manageKeyModal");
                    if (manageKeyModal) manageKeyModal.style.display = "none";
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

// 设置通用设置表单
function setupGeneralSettingsForm() {
    const saveButton = document.getElementById('saveGeneralSettings');
    if (saveButton) {
        saveButton.addEventListener('click', async function() {
            await saveGeneralSettings();
        });
    }
}

// 设置用户设置表单
function setupUserSettingsForm() {
    const saveButton = document.getElementById('saveUserSettings');
    if (saveButton) {
        saveButton.addEventListener('click', async function() {
            await saveUserSettings();
        });
    }

    const resetButton = document.getElementById('resetUserSettings');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            if (confirm('确定要重置表单吗？所有未保存的更改将丢失。')) {
                loadUserSettings();
            }
        });
    }
}

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
    setupUserSettingsForm();
}

export { initializeUI };
