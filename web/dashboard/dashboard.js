// 获取模态框元素
var modal = document.getElementById("addPoolModal");

// 获取打开模态框的按钮和关闭按钮
var btn = document.getElementById("addPoolButton");
var span = document.getElementsByClassName("close")[0];

// 当用户点击按钮时打开模态框
btn.onclick = function() {
    modal.style.display = "block";
}

// 当用户点击关闭按钮时关闭模态框
span.onclick = function() {
    modal.style.display = "none";
}

// 当用户点击模态框外区域时关闭模态框
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// 表单提交事件处理
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
            alert('连接池添加成功！如未显示请刷新页面...');
            location.reload();
        } else {
            alert('连接池添加失败！');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('请求失败，请检查控制台日志。');
    }

    modal.style.display = "none";
});

// 加载连接池列表
async function loadPools() {
    const response = await fetch('/api/v1/pools');
    if (response.ok) {
        const pools = await response.json();
        const poolListElement = document.getElementById('poolList');
        poolListElement.innerHTML = '';
        pools.forEach((pool, index) => {
            // 创建一个包含所有信息的父div
            const poolContainer = document.createElement('div');
            poolContainer.className = 'poolInfo';

            // 创建并设置 Pool ID 的 div
            const idDiv = document.createElement('div');
            idDiv.textContent = `Pool ID: ${pool.id}`;

            // 创建并设置 Host 的 div
            const hostDiv = document.createElement('div');
            hostDiv.textContent = `Host: ${pool.host}`;

            // 创建并设置 Port 的 div
            const portDiv = document.createElement('div');
            portDiv.textContent = `Port: ${pool.port}`;

            // 将这些 div 添加到父容器中
            poolContainer.appendChild(idDiv);
            poolContainer.appendChild(hostDiv);
            poolContainer.appendChild(portDiv);

            // 将整个池的信息添加到列表中
            poolListElement.appendChild(poolContainer);
        });
    } else {
        alert('无法加载连接池列表');
    }
}

// 页面加载完成后加载连接池列表
window.onload = loadPools;