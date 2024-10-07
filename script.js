document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');

    const settingsForm = document.getElementById('settings-form');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsDiv = document.getElementById('settings');
    const hasLunchBreak = document.getElementById('has-lunch-break');
    const lunchBreakTimes = document.getElementById('lunch-break-times');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    const earnings = document.getElementById('earnings');
    const hourlyRateElement = document.getElementById('hourly-rate');

    let settings = {};

    // 加载保存的设置
    chrome.storage.sync.get(['settings'], function(result) {
        console.log('Loaded settings:', result.settings);
        if (result.settings) {
            settings = result.settings;
            loadSettings(settings);
            updateProgressAndEarnings();
        } else {
            showSettings();
        }
    });

    function loadSettings(settings) {
        if (document.getElementById('monthly-salary')) document.getElementById('monthly-salary').value = settings.monthlySalary || '';
        if (document.getElementById('work-days')) document.getElementById('work-days').value = settings.workDays || '';
        if (document.getElementById('work-start')) document.getElementById('work-start').value = settings.workStart || '';
        if (document.getElementById('work-end')) document.getElementById('work-end').value = settings.workEnd || '';
        if (hasLunchBreak) hasLunchBreak.checked = settings.hasLunchBreak || false;
        if (document.getElementById('lunch-start')) document.getElementById('lunch-start').value = settings.lunchStart || '';
        if (document.getElementById('lunch-end')) document.getElementById('lunch-end').value = settings.lunchEnd || '';

        if (lunchBreakTimes) lunchBreakTimes.style.display = settings.hasLunchBreak ? 'block' : 'none';
    }

    function showSettings() {
        if (settingsDiv) {
            settingsDiv.style.display = 'block';
            if (progressBar) progressBar.style.width = '0%';
            if (progressPercentage) progressPercentage.textContent = '0%';
            if (earnings) earnings.textContent = '请先设置工作信息';
        }
    }

    // 显示当前时间并更新进度和收入
    function updateCurrentTime() {
        const now = new Date();
        const currentTimeElement = document.getElementById('current-time');
        if (currentTimeElement) currentTimeElement.textContent = `当前时间：${now.toLocaleString()}`;
        if (settings.workStart && settings.workEnd) {
            updateProgressAndEarnings();
        }
    }

    // 更新进度和收入
    function updateProgressAndEarnings() {
        if (!settings.workStart || !settings.workEnd) {
            console.error('Work start or end time not set');
            showSettings();
            return;
        }

        const now = new Date();
        const startTime = new Date(now.toDateString() + ' ' + settings.workStart);
        const endTime = new Date(now.toDateString() + ' ' + settings.workEnd);

        let totalWorkTime = endTime - startTime;
        let elapsedTime = now - startTime;

        if (settings.hasLunchBreak && settings.lunchStart && settings.lunchEnd) {
            const lunchStart = new Date(now.toDateString() + ' ' + settings.lunchStart);
            const lunchEnd = new Date(now.toDateString() + ' ' + settings.lunchEnd);
            const lunchTime = lunchEnd - lunchStart;

            if (now > lunchStart && now < lunchEnd) {
                elapsedTime -= (now - lunchStart);
            } else if (now >= lunchEnd) {
                elapsedTime -= lunchTime;
            }

            totalWorkTime -= lunchTime;
        }

        if (now < startTime) {
            progressBar.style.width = '0%';
            progressPercentage.textContent = '0%';
            earnings.textContent = '今日收入：¥0.00';
            return;
        }

        if (now > endTime) {
            progressBar.style.width = '100%';
            progressPercentage.textContent = '100%';
            elapsedTime = totalWorkTime; // 确保不会超过总工作时间
        } else {
            const progress = (elapsedTime / totalWorkTime) * 100;
            progressBar.style.width = `${progress}%`;
            progressPercentage.textContent = `${progress.toFixed(2)}%`;
        }

        if (settings.monthlySalary && settings.workDays) {
            const monthlyWorkHours = (totalWorkTime / 3600000) * settings.workDays;
            const hourlyRate = settings.monthlySalary / monthlyWorkHours;
            const workedHours = elapsedTime / 3600000;
            const earnedToday = hourlyRate * workedHours;
            
            earnings.textContent = `今日收入：¥${earnedToday.toFixed(2)}`;
            hourlyRateElement.textContent = `时薪：¥${hourlyRate.toFixed(2)}/小时`; // 新增：显示时薪
        } else {
            console.error('Monthly salary or work days not set');
            earnings.textContent = '请设置月薪和工作天数';
            hourlyRateElement.textContent = ''; // 清空时薪显示
        }
    }

    // 每秒更新一次时间、进度和收入
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // 设置按钮功能
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            if (settingsDiv) settingsDiv.style.display = settingsDiv.style.display === 'none' ? 'block' : 'none';
        });
    }

    // 午休复选框功能
    if (hasLunchBreak) {
        hasLunchBreak.addEventListener('change', function() {
            if (lunchBreakTimes) lunchBreakTimes.style.display = this.checked ? 'block' : 'none';
        });
    }

    // 保存设置
    if (settingsForm) {
        settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const workStart = document.getElementById('work-start') ? document.getElementById('work-start').value : '';
            const workEnd = document.getElementById('work-end') ? document.getElementById('work-end').value : '';

            if (!workStart || !workEnd) {
                alert('请设置上下班时间');
                return;
            }

            settings = {
                monthlySalary: document.getElementById('monthly-salary') ? document.getElementById('monthly-salary').value : '',
                workDays: document.getElementById('work-days') ? document.getElementById('work-days').value : '',
                workStart: workStart,
                workEnd: workEnd,
                hasLunchBreak: hasLunchBreak ? hasLunchBreak.checked : false,
                lunchStart: document.getElementById('lunch-start') ? document.getElementById('lunch-start').value : '',
                lunchEnd: document.getElementById('lunch-end') ? document.getElementById('lunch-end').value : ''
            };

            chrome.storage.sync.set({settings: settings}, function() {
                console.log('设置已保存');
                if (settingsDiv) settingsDiv.style.display = 'none';
                updateProgressAndEarnings();
            });
        });
    }

    // 修改获取古诗的函数
    async function fetchPoem() {
        try {
            const response = await fetch('https://v1.jinrishici.com/all.json');
            const data = await response.json();
            console.log('Fetched poem:', data); // 添加日志
            const poemTextElement = document.getElementById('poem-text');
            const poemAuthorElement = document.getElementById('poem-author');
            if (poemTextElement && poemAuthorElement) {
                poemTextElement.textContent = data.content;
                poemAuthorElement.textContent = `—— ${data.author} 《${data.origin}》`;
            } else {
                console.error('Poem elements not found in the DOM');
            }
        } catch (error) {
            console.error('获取诗词失败:', error);
            const poemTextElement = document.getElementById('poem-text');
            const poemAuthorElement = document.getElementById('poem-author');
            if (poemTextElement && poemAuthorElement) {
                poemTextElement.textContent = '心若冰清，天塌不惊。';
                poemAuthorElement.textContent = '—— 佚名';
            }
        }
    }

    // 确保在文档加载完成后立即调用fetchPoem函数
    fetchPoem();

    // 其他现有的代码...
});