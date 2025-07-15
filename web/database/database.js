document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const poolId = urlParams.get('poolId');
    let apiPrefix = '/api/v1/query';
    
    // 获取API前缀
    try {
        const prefixResponse = await fetch('/api/v1/config/api-prefix');
        if (prefixResponse.ok) {
            const prefixData = await prefixResponse.json();
            apiPrefix = prefixData.apiPrefix;
        }
    } catch (error) {
        console.error('获取API前缀失败:', error);
    }

    // 更新代码示例中的API前缀
    updateApiExamplePrefix(apiPrefix);

    if (!poolId) {
        alert('未找到连接池ID');
        return;
    }

    try {
        const response = await fetch(`/api/v1/pools/${poolId}`);
        if (response.ok) {
            const pool = await response.json();

            const poolDetailsElement = document.getElementById('poolDetails');
            poolDetailsElement.innerHTML = `
                <div>ID: ${pool.id}</div>
                <div>Host: ${pool.host}</div>
                <div>Port: ${pool.port}</div>
                <div>User: ${pool.user}</div>
                <div>Password: ${pool.password}</div>
                <div>Database: ${pool.database}</div>
            `;

            // 设置编辑表单的初始值
            document.getElementById('editId').value = pool.id;
            document.getElementById('editHost').value = pool.host;
            document.getElementById('editPort').value = pool.port;
            document.getElementById('editUser').value = pool.user;
            document.getElementById('editPassword').value = pool.password;
            document.getElementById('editDatabase').value = pool.database;
        } else {
            alert('无法加载连接池详情');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('请求失败，请检查控制台日志。');
    }

    // 更新API示例中的前缀
    function updateApiExamplePrefix(prefix) {
        const codeBlock = document.querySelector('.code-block pre');
        if (codeBlock) {
            // 更新示例代码中的URL部分
            const urlSpan = codeBlock.querySelector('.url');
            if (urlSpan) {
                urlSpan.textContent = `http://localhost:3000${prefix}/exec/${poolId}`;
            }
        }
    }

    // 返回按钮点击事件
    document.getElementById('backButton').onclick = () => {
        window.location.href = '../dashboard/dashboard.html';
    };

    // 编辑按钮点击事件
    document.getElementById('editButton').onclick = () => {
        const modal = document.getElementById('editModal');
        modal.style.display = 'flex'; // 使用flex而不是block
        modal.classList.add('show');
    };

    // 关闭编辑模态框
    document.querySelector('#editModal .close').onclick = () => {
        const modal = document.getElementById('editModal');
        modal.style.display = 'none';
        modal.classList.remove('show');
    };

    // 删除按钮点击事件
    document.getElementById('deleteButton').onclick = () => {
        const modal = document.getElementById('deleteModal');
        modal.style.display = 'flex'; // 使用flex而不是block
        modal.classList.add('show');
    };

    // 关闭删除模态框
    document.querySelector('#deleteModal .close').onclick = () => {
        const modal = document.getElementById('deleteModal');
        modal.style.display = 'none';
        modal.classList.remove('show');
    };

    // 取消删除按钮点击事件
    document.getElementById('cancelDelete').onclick = () => {
        const modal = document.getElementById('deleteModal');
        modal.style.display = 'none';
        modal.classList.remove('show');
    };

    // 表单提交事件处理
    document.getElementById('editPoolForm').addEventListener('submit', async function(event) {
        event.preventDefault();

        const formData = {
            id: document.getElementById('editId').value,
            host: document.getElementById('editHost').value,
            port: parseInt(document.getElementById('editPort').value),
            user: document.getElementById('editUser').value,
            password: document.getElementById('editPassword').value,
            database: document.getElementById('editDatabase').value
        };

        try {
            const response = await fetch(`/api/v1/pools/${formData.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('连接池更新成功！');
                location.reload();
            } else {
                alert('连接池更新失败！');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('请求失败，请检查控制台日志。');
        }

        document.getElementById('editModal').style.display = 'none';
    });

    // 确认删除按钮点击事件
    document.getElementById('confirmDelete').onclick = async () => {
        try {
            const response = await fetch(`/api/v1/pools/${poolId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('连接池删除成功！');
                window.location.href = '../dashboard/dashboard.html';
            } else {
                alert('连接池删除失败！');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('请求失败，请检查控制台日志。');
        }

        document.getElementById('deleteModal').style.display = 'none';
    };
});