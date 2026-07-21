import { loadSettings, saveSettings } from './storage.js';

/**
 * 初始化開機啟動模組
 */
export function initStartup() {
  const checkbox = document.getElementById('checkbox-startup');
  const guide = document.getElementById('startup-guide');
  const btnDownload = document.getElementById('btn-download-shortcut');
  
  if (!checkbox) return;

  const settings = loadSettings();

  // 1. 偵測瀏覽器是否支援 PWA runOnOsLogin API
  const hasAPI = 'runOnOsLogin' in navigator;

  if (hasAPI) {
    // 查詢當前的開機啟動狀態並更新 Checkbox
    navigator.runOnOsLogin.get()
      .then(state => {
        checkbox.checked = (state === 'windowed');
        // 同步存入 LocalStorage 設定
        if (settings.startup !== checkbox.checked) {
          settings.startup = checkbox.checked;
          saveSettings(settings);
        }
      })
      .catch(err => {
        console.warn('查詢 runOnOsLogin 狀態失敗，回退至預設值:', err);
        checkbox.checked = settings.startup;
      });

    // 監聽開關切換
    checkbox.addEventListener('change', async () => {
      const mode = checkbox.checked ? 'windowed' : 'not-run';
      try {
        await navigator.runOnOsLogin.set(mode);
        settings.startup = checkbox.checked;
        saveSettings(settings);
      } catch (err) {
        console.error('設定 PWA 開機啟動 API 失敗，顯示手動教學:', err);
        // 如果 API 調用失敗（例如權限被拒或瀏覽器拒絕），顯示手動教學
        if (checkbox.checked) {
          if (guide) guide.classList.remove('hidden');
        } else {
          if (guide) guide.classList.add('hidden');
        }
      }
    });
  } else {
    // 不支援 API：根據儲存的設定初始化 checkbox，並在勾選時顯示手動指引
    checkbox.checked = settings.startup;
    if (settings.startup && guide) {
      guide.classList.remove('hidden');
    }

    checkbox.addEventListener('change', () => {
      settings.startup = checkbox.checked;
      saveSettings(settings);
      
      if (checkbox.checked) {
        if (guide) guide.classList.remove('hidden');
      } else {
        if (guide) guide.classList.add('hidden');
      }
    });
  }

  // 2. 手動下載啟動捷徑功能
  if (btnDownload) {
    btnDownload.addEventListener('click', () => {
      downloadWindowsShortcut();
    });
  }
}

/**
 * 動態生成 Windows 的 .url 捷徑檔案並觸發下載
 */
function downloadWindowsShortcut() {
  const currentUrl = window.location.origin;
  
  // Windows .url 網頁捷徑檔案格式
  const shortcutContent = `[InternetShortcut]
URL=${currentUrl}
IDList=
HotKey=0
IconFile=
IconIndex=0
`;

  const blob = new Blob([shortcutContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = '健康便利貼.url';
  
  document.body.appendChild(link);
  link.click();
  
  // 釋放資源
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
