import { modals, openModal } from './modals.js';
import { loadApiKeys, loadPools } from './api.js';

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

            openModal('manageKey');
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

            openModal('showKey');
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

export { editKey, rotateKey, deleteKey, editPool, deletePool };