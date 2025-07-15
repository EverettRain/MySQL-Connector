import {loadApiKeys, loadGeneralSettings, loadUserSettings} from './api.js';

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
            } else if (targetSection === 'user') {
                loadUserSettings(); // 加载用户设置
            }
        });
    });
}

export { setupNavigation };