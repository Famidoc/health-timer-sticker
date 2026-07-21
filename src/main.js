import './style.css';
import { initStickers } from './modules/sticker.js';
import { initAudio, unlockAudio } from './modules/audio.js';
import { initTimer, resetTimer, startTimer } from './modules/timer.js';
import { initStartup } from './modules/startup.js';
import { loadSettings, saveSettings, loadLocalAudioFile, saveLocalAudioFile } from './modules/storage.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化各模組
  initAudio();
  initStickers();
  initTimer();
  initStartup();

  // 2. 迎賓介面與音訊解鎖
  const welcomeOverlay = document.getElementById('welcome-overlay');
  const btnStartApp = document.getElementById('btn-start-app');
  const appContainer = document.getElementById('app');

  const startApplication = () => {
    // 切換 UI 顯示
    if (welcomeOverlay) welcomeOverlay.classList.remove('active');
    if (appContainer) appContainer.classList.remove('hidden');
    
    // 自動啟動健康計時器
    startTimer();
  };

  if (btnStartApp) {
    btnStartApp.addEventListener('click', () => {
      // 解鎖音訊 (AudioContext 限制)
      unlockAudio();
      
      // 請求系統桌面通知權限，以便於網頁在背景/最小化時也能提醒使用者
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(() => {
          startApplication();
        }).catch(err => {
          console.warn('請求通知權限失敗:', err);
          startApplication();
        });
      } else {
        startApplication();
      }
    });
  }

  // 關鍵優化：如果先前已經有桌面通知權限，則不需等待使用者手動點擊「開始使用」按鈕，
  // 而是直接跳過迎賓畫面，在背景/工作列自動啟動計時器。
  if ('Notification' in window && Notification.permission === 'granted') {
    startApplication();
  }

  // 設定一次性的全域事件監聽，當使用者首次與頁面互動（點選或按鍵）時，解鎖音訊
  const handleFirstInteraction = () => {
    unlockAudio();
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('keydown', handleFirstInteraction);
  };
  document.addEventListener('click', handleFirstInteraction);
  document.addEventListener('keydown', handleFirstInteraction);

  // 3. 電腦版控制中心面板拖曳功能 (可在桌面任意移動)
  setupControlPanelDrag();

  // 4. 系統設定面板互動邏輯
  setupSettingsEvents();
});

/**
 * 實現電腦版控制中心面板的拖曳功能
 */
function setupControlPanelDrag() {
  const panel = document.getElementById('control-panel');
  if (!panel) return;

  const dragHandle = panel.querySelector('.drag-handle');
  if (!dragHandle) return;

  dragHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    const initialLeft = rect.left;
    const initialTop = rect.top;

    const onMouseMove = (moveEvt) => {
      const dx = moveEvt.clientX - startX;
      const dy = moveEvt.clientY - startY;

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      // 限制拖曳範圍在視窗內
      const maxLeft = window.innerWidth - rect.width;
      const maxTop = window.innerHeight - rect.height;
      newLeft = Math.max(10, Math.min(newLeft, maxLeft - 10));
      newTop = Math.max(10, Math.min(newTop, maxTop - 10));

      panel.style.left = `${newLeft}px`;
      panel.style.top = `${newTop}px`;
      panel.style.right = 'auto'; // 移除 RWD 預設干擾
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

/**
 * 綁定系統設定面板的所有事件
 */
function setupSettingsEvents() {
  const modal = document.getElementById('settings-modal');
  const btnOpen = document.getElementById('btn-open-settings');
  const btnClose = document.getElementById('btn-close-settings');
  const btnSave = document.getElementById('btn-save-settings');
  
  const inputDuration = document.getElementById('input-timer-duration');
  const selectAudio = document.getElementById('select-audio-type');
  const checkboxStartup = document.getElementById('checkbox-startup');

  // 取得本機音樂上傳相關 UI 元素
  const inputLocalAudio = document.getElementById('input-local-audio');
  const localAudioGroup = document.getElementById('local-audio-group');
  const localAudioStatus = document.getElementById('local-audio-status');

  // 取得桌面通知狀態 UI 元素
  const statusSpan = document.getElementById('notification-permission-status');
  const btnRequest = document.getElementById('btn-request-permission');
  const btnTest = document.getElementById('btn-test-notification');
  const warningTips = document.getElementById('notification-warning-tips');

  if (!modal) return;

  // 更新桌面通知狀態 UI 的狀態
  const updateNotificationStatusUI = () => {
    if (!('Notification' in window)) {
      if (statusSpan) {
        statusSpan.innerText = '❌ 此瀏覽器不支援通知';
        statusSpan.style.color = 'var(--danger-color)';
      }
      if (btnTest) btnTest.classList.add('hidden');
      if (btnRequest) btnRequest.classList.add('hidden');
      if (warningTips) warningTips.classList.add('hidden');
      return;
    }

    const permission = Notification.permission;
    if (permission === 'granted') {
      if (statusSpan) {
        statusSpan.innerText = '✅ 已授權';
        statusSpan.style.color = 'var(--primary-color)';
      }
      if (btnRequest) btnRequest.classList.add('hidden');
      if (warningTips) warningTips.classList.add('hidden');
      if (btnTest) btnTest.classList.remove('hidden');
    } else if (permission === 'denied') {
      if (statusSpan) {
        statusSpan.innerText = '❌ 已封鎖';
        statusSpan.style.color = 'var(--danger-color)';
      }
      if (btnRequest) btnRequest.classList.add('hidden');
      if (warningTips) warningTips.classList.remove('hidden');
      if (btnTest) btnTest.classList.add('hidden');
    } else {
      if (statusSpan) {
        statusSpan.innerText = '❓ 未授權';
        statusSpan.style.color = 'var(--text-secondary)';
      }
      if (btnRequest) btnRequest.classList.remove('hidden');
      if (warningTips) warningTips.classList.add('hidden');
      if (btnTest) btnTest.classList.remove('hidden');
    }
  };

  // 開啟設定
  if (btnOpen) {
    btnOpen.addEventListener('click', async () => {
      const settings = loadSettings();
      
      // 載入當前值至 UI
      if (inputDuration) inputDuration.value = settings.duration;
      if (selectAudio) {
        selectAudio.value = settings.audioType;
        toggleAudioGroup(settings.audioType);
      }
      if (checkboxStartup) checkboxStartup.checked = settings.startup;

      // 檢查 IndexedDB 是否有已儲存的本地音樂檔案
      if (localAudioStatus) {
        try {
          const blob = await loadLocalAudioFile();
          if (blob) {
            localAudioStatus.innerText = `🎵 已儲存本地音樂 (檔案大小: ${(blob.size / 1024 / 1024).toFixed(2)} MB)`;
            localAudioStatus.style.color = 'var(--primary-color)';
          } else {
            localAudioStatus.innerText = '暫無已儲存的音樂檔。上傳後音樂將永久存在於您瀏覽器中，離線也能播放。';
            localAudioStatus.style.color = 'var(--text-secondary)';
          }
        } catch (err) {
          localAudioStatus.innerText = '讀取儲存狀態失敗';
          localAudioStatus.style.color = 'var(--danger-color)';
        }
      }

      // 更新通知權限 UI
      updateNotificationStatusUI();

      modal.classList.add('active');
    });
  }

  // 關閉設定
  const closeModal = () => {
    modal.classList.remove('active');
  };

  if (btnClose) btnClose.addEventListener('click', closeModal);
  
  // 點擊 Modal 以外區域關閉
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // 切換音訊下拉選單時顯示/隱藏自訂或本地上傳 UI
  if (selectAudio) {
    selectAudio.addEventListener('change', (e) => {
      toggleAudioGroup(e.target.value);
    });
  }

  // 要求桌面通知權限
  if (btnRequest) {
    btnRequest.addEventListener('click', () => {
      Notification.requestPermission().then(() => {
        updateNotificationStatusUI();
      });
    });
  }

  // 測試發送通知
  if (btnTest) {
    btnTest.addEventListener('click', () => {
      if (!('Notification' in window)) return;

      const triggerTest = () => {
        const title = '健康計時器 - 測試桌面通知';
        const options = {
          body: '這是一則測試通知，代表桌面彈出提示功能正常！',
          icon: '/icon-192.png',
          tag: 'health-timer-test',
          requireInteraction: false
        };

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, options);
          });
        } else {
          new Notification(title, options);
        }
      };

      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          updateNotificationStatusUI();
          if (permission === 'granted') {
            triggerTest();
          }
        });
      } else if (Notification.permission === 'granted') {
        triggerTest();
      } else {
        alert('通知權限已被封鎖，請點擊網址列左側鎖頭開啟通知權限。');
      }
    });
  }

  // 處理本地檔案上傳
  if (inputLocalAudio) {
    inputLocalAudio.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // 檢查檔案大小是否大於 15MB
      const maxSize = 15 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('音樂檔案大小不能超過 15MB！');
        inputLocalAudio.value = '';
        return;
      }

      if (localAudioStatus) {
        localAudioStatus.innerText = '⏳ 正在儲存音樂檔案到瀏覽器中...';
        localAudioStatus.style.color = 'var(--text-secondary)';
      }

      try {
        await saveLocalAudioFile(file);
        if (localAudioStatus) {
          localAudioStatus.innerText = `✅ 儲存成功！檔案：${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
          localAudioStatus.style.color = 'var(--primary-color)';
        }
      } catch (err) {
        console.error('儲存本地音樂失敗:', err);
        if (localAudioStatus) {
          localAudioStatus.innerText = '❌ 儲存音樂失敗，請重新選取檔案。';
          localAudioStatus.style.color = 'var(--danger-color)';
        }
      }
    });
  }

  // 儲存設定
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const duration = parseInt(inputDuration.value, 10) || 30;
      const audioType = selectAudio.value;
      const startup = checkboxStartup ? checkboxStartup.checked : false;

      // 儲存至 Storage
      saveSettings({
        duration,
        audioType,
        startup
      });

      // 重設健康計時器時間
      resetTimer(duration);

      closeModal();
    });
  }

  function toggleAudioGroup(type) {
    // 控制本地上傳音樂群組
    if (localAudioGroup) {
      if (type === 'local-file') {
        localAudioGroup.classList.remove('hidden');
      } else {
        localAudioGroup.classList.add('hidden');
      }
    }
  }
}

