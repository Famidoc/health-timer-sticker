const STICKERS_KEY = 'health_stickers_data';
const SETTINGS_KEY = 'health_stickers_settings';

const DEFAULT_SETTINGS = {
  duration: 30, // 分鐘
  audioType: 'online-piano', // 預設溫和鋼琴曲
  customAudioUrl: '',
  startup: false
};

/**
 * 儲存所有便利貼資料到 LocalStorage
 * @param {Array} stickers - 便利貼資料陣列
 */
export function saveStickers(stickers) {
  localStorage.setItem(STICKERS_KEY, JSON.stringify(stickers));
}

/**
 * 從 LocalStorage 載入所有便利貼資料
 * @returns {Array} 便利貼資料陣列
 */
export function loadStickers() {
  const data = localStorage.getItem(STICKERS_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * 儲存設定值到 LocalStorage
 * @param {Object} settings - 設定物件
 */
export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * 從 LocalStorage 載入設定值
 * @returns {Object} 設定物件
 */
export function loadSettings() {
  const data = localStorage.getItem(SETTINGS_KEY);
  return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
}

// ==========================================================================
// IndexedDB 音訊檔案儲存服務 (用於本地上傳音樂)
// ==========================================================================
const DB_NAME = 'health_timer_db';
const DB_VERSION = 1;
const STORE_NAME = 'audio_files';

function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 儲存本地音訊檔案到 IndexedDB
 * @param {Blob} blob - 音訊檔案 Blob
 */
export async function saveLocalAudioFile(blob) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(blob, 'custom_audio');
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * 從 IndexedDB 載入本地音訊檔案
 * @returns {Promise<Blob|null>} 音訊檔案 Blob
 */
export async function loadLocalAudioFile() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('custom_audio');
    request.onsuccess = (e) => resolve(e.target.result || null);
    request.onerror = (e) => reject(e.target.error);
  });
}
