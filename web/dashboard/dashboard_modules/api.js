// 加载通用设置
async function loadGeneralSettings() {
    try {
        const response = await fetch('/api/v1/security/general-settings');
        if (response.ok) {
            window.generalSettings = await response.json();
        } else {
            console.error('无法加载通用设置');
        }
    } catch (error) {
        console.error('加载通用设置失败:', error);
    }
}

// 保存通用设置
async function saveGeneralSettings() {
    try {
        const response = await fetch('/api/v1/security/general-settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(window.generalSettings)
        });

        if (response.ok) {
            alert('设置保存成功');
            return true;
        } else {
            alert('保存设置失败');
            return false;
        }
    } catch (error) {
        console.error('保存设置失败:', error);
        alert('保存设置失败，请检查网络连接');
        return false;
    }
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

async function loadUserSettings() {
    try {
        const response = await fetch('/api/v1/security/user-settings');
        if (response.ok) {
            const settings = await response.json();

            // 填充表单
            document.getElementById('userHost').value = settings.host || '';
            document.getElementById('userPort').value = settings.port || '';
            document.getElementById('userApiPrefix').value = settings.apiPrefix || '';

            // 设置开关状态
            document.getElementById('userLogMode').checked = settings.logMode === true;
            document.getElementById('userMaxConnections').value =
                settings.security?.maxConnections || '';
            document.getElementById('userAllowDestructive').checked =
                settings.security?.allowDestructive === true;

            // 格式化日期显示
            document.getElementById('userPasswordUpdated').textContent = settings.passwordUpdated ?
                new Date(settings.passwordUpdated).toLocaleString() : '未设置';

            return settings;
        } else {
            console.error('无法加载用户设置');
            return null;
        }
    } catch (error) {
        console.error('加载用户设置失败:', error);
        return null;
    }
}

async function saveUserSettings() {
    try {
        // 收集表单数据
        const formData = {
            host: document.getElementById('userHost').value,
            port: parseInt(document.getElementById('userPort').value) || 3000,
            apiPrefix: document.getElementById('userApiPrefix').value,
            logMode: document.getElementById('userLogMode').checked,
            security: {
                maxConnections: parseInt(document.getElementById('userMaxConnections').value) || 10,
                allowDestructive: document.getElementById('userAllowDestructive').checked
            }
        };

        const response = await fetch('/api/v1/security/user-settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            alert('用户设置保存成功，部分设置修改需要重启服务端生效');
            return true;
        } else {
            const error = await response.json();
            alert(`保存用户设置失败: ${error.message || '未知错误'}`);
            return false;
        }
    } catch (error) {
        console.error('保存用户设置失败:', error);
        alert('保存用户设置失败，请检查网络连接');
        return false;
    }
}

export { 
    loadGeneralSettings,
    saveGeneralSettings,
    loadPools,
    loadApiKeys,
    loadUserSettings,
    saveUserSettings
};