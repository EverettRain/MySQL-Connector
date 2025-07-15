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

// 打开模态框
function openModal(modalName) {
    if (modals[modalName]) {
        modals[modalName].style.display = "block";
    }
}

// 关闭模态框
function closeModal(modalName) {
    if (modals[modalName]) {
        modals[modalName].style.display = "none";
    }
}

export { modals, initModals, openModal, closeModal };