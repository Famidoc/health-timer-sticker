import { loadSettings } from './storage.js';
import { playAlarm, stopAlarm } from './audio.js';

let totalSeconds = 30 * 60; // 預設 30 分鐘
let secondsLeft = totalSeconds;
let timerInterval = null;
let isRunning = false;



// SVG 圓環最大 dashoffset
const RING_CIRCUMFERENCE = 326.7;

/**
 * 初始化計時器模組
 */
export function initTimer() {
  const settings = loadSettings();
  totalSeconds = settings.duration * 60;
  secondsLeft = totalSeconds;
  
  updateTimerDisplay();
  setupTimerEvents();
}

/**
 * 更新計時器的文字顯示與進度條
 */
function updateTimerDisplay() {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  // 更新電腦版顯示
  const display = document.getElementById('timer-display');
  if (display) display.innerText = timeStr;

  // 更新手機版顯示
  const mobileDisplay = document.getElementById('mobile-timer-display');
  if (mobileDisplay) mobileDisplay.innerText = timeStr;

  // 更新圓環進度條
  const progressRing = document.getElementById('timer-ring-progress');
  if (progressRing) {
    const progress = secondsLeft / totalSeconds;
    const offset = RING_CIRCUMFERENCE - (progress * RING_CIRCUMFERENCE);
    progressRing.style.strokeDashoffset = offset;
  }
}

/**
 * 綁定計時器的 UI 事件
 */
function setupTimerEvents() {
  const btnToggle = document.getElementById('btn-toggle-timer');
  const btnReset = document.getElementById('btn-reset-timer');
  const btnMobileToggle = document.getElementById('btn-mobile-toggle-timer');

  const toggleHandler = () => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  if (btnToggle) btnToggle.addEventListener('click', toggleHandler);
  if (btnMobileToggle) btnMobileToggle.addEventListener('click', toggleHandler);
  
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      resetTimer();
    });
  }

  // 通知彈框的按鈕事件
  const btnRest = document.getElementById('btn-toast-rest');
  const btnSnooze = document.getElementById('btn-toast-snooze');

  if (btnRest) {
    btnRest.addEventListener('click', () => {
      hideNotification();
      stopAlarm();
      resetTimer();
      startTimer();
    });
  }

  if (btnSnooze) {
    btnSnooze.addEventListener('click', () => {
      hideNotification();
      stopAlarm();
      // 延後 5 分鐘
      snoozeTimer(5);
    });
  }

  // 監聽來自 Service Worker 的訊息 (點擊系統桌面通知時觸發)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.action === 'start-rest') {
        hideNotification();
        stopAlarm();
        resetTimer();
        startTimer();
      }
    });
  }
}

/**
 * 開始計時
 */
export function startTimer() {
  if (isRunning) return;
  isRunning = true;
  updateControlButtonsState();

  timerInterval = setInterval(() => {
    if (secondsLeft > 0) {
      secondsLeft--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      timerInterval = null;
      isRunning = false;
      triggerHealthAlert();
    }
  }, 1000);
}

/**
 * 暫停計時
 */
export function pauseTimer() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  updateControlButtonsState();
}

/**
 * 重設計時器 (若 duration 改變，將套用新長度)
 */
export function resetTimer(newDurationMinutes = null) {
  pauseTimer();
  
  if (newDurationMinutes) {
    totalSeconds = newDurationMinutes * 60;
  } else {
    const settings = loadSettings();
    totalSeconds = settings.duration * 60;
  }
  
  secondsLeft = totalSeconds;
  updateTimerDisplay();
}

/**
 * 延後提醒 (Snooze)
 * @param {Number} minutes - 延後的分鐘數
 */
function snoozeTimer(minutes) {
  pauseTimer();
  totalSeconds = minutes * 60;
  secondsLeft = totalSeconds;
  updateTimerDisplay();
  startTimer();
}

/**
 * 更新播放/暫停按鈕的文字與狀態
 */
function updateControlButtonsState() {
  const btnToggle = document.getElementById('btn-toggle-timer');
  const btnMobileToggle = document.getElementById('btn-mobile-toggle-timer');
  
  const icon = isRunning ? '⏸' : '▶';
  
  if (btnToggle) btnToggle.innerText = icon;
  if (btnMobileToggle) btnMobileToggle.innerText = icon;
}

/**
 * 觸發健康警示
 */
function triggerHealthAlert() {
  const settings = loadSettings();
  
  // 1. 播放療癒音訊
  playAlarm(settings);

  // 2. 顯示網頁內部通知 Toast
  const toast = document.getElementById('notification-toast');
  if (toast) {
    toast.classList.add('active');
  }

  // 3. 發送系統桌面通知 (優先使用 Service Worker 以確保背景/最小化時穩定彈出)
  const title = '該起來動一動囉！';
  const options = {
    body: `您已經坐了 ${settings.duration} 分鐘，請離開座位活動筋骨，看遠方 30 秒，並喝點水。`,
    icon: '/icon-192.png',
    tag: 'health-timer-alert', // 防止重複彈出
    requireInteraction: true // 保持顯示直到手動點擊
  };

  if ('serviceWorker' in navigator && 'Notification' in window) {
    navigator.serviceWorker.ready.then(registration => {
      if (Notification.permission === 'granted') {
        registration.showNotification(title, options);
      }
    });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, options);
  }
}

/**
 * 隱藏通知 Toast
 */
function hideNotification() {
  const toast = document.getElementById('notification-toast');
  if (toast) {
    toast.classList.remove('active');
  }
}

