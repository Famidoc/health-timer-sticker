import { loadLocalAudioFile } from './storage.js';

let audioCtx = null;
let alarmInterval = null;
let alarmAudioElement = null;

// 線上預設 MP3 音訊網址 (使用穩定、免版稅的 SoundHelix 樂曲作為範例)
const AUDIO_URLS = {
  'online-piano': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'online-rain': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  'online-lofi': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3'
};

/**
 * 初始化音訊系統，與 index.html 中的 audio 標籤進行綁定
 */
export function initAudio() {
  alarmAudioElement = document.getElementById('alarm-audio');
}

/**
 * 解鎖音訊 (在使用者點選「開始使用」時呼叫，以滿足瀏覽器安全政策)
 */
export function unlockAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  // 同步解鎖 HTML5 Audio 標籤
  if (alarmAudioElement) {
    const playPromise = alarmAudioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          alarmAudioElement.pause();
          alarmAudioElement.currentTime = 0;
        })
        .catch(err => console.log('解鎖 HTML5 Audio 失敗:', err));
    }
  }
}

let localAudioUrl = null;

/**
 * 開始播放提醒音樂或合成音效
 * @param {Object} settings - 包含音訊類型與自訂網址的設定物件
 */
export async function playAlarm(settings) {
  stopAlarm(); // 確保先停止上一次的播放

  const { audioType, customAudioUrl } = settings;

  if (audioType === 'local-file') {
    // 1. 播放本地上傳音樂
    try {
      const blob = await loadLocalAudioFile();
      if (!blob) throw new Error('尚未上傳本地音樂檔案');

      if (localAudioUrl) {
        URL.revokeObjectURL(localAudioUrl);
      }
      localAudioUrl = URL.createObjectURL(blob);

      if (alarmAudioElement) {
        alarmAudioElement.src = localAudioUrl;
        alarmAudioElement.play().catch(err => {
          console.error('播放本地音樂失敗，將自動降級使用離線磬聲。錯誤:', err);
          playOfflineBell();
        });
      }
    } catch (err) {
      console.error('讀取本地音樂失敗，將自動降級使用離線磬聲。錯誤:', err);
      playOfflineBell();
    }
  } else if (audioType.startsWith('online-')) {
    // 2. 播放線上音樂
    let src = AUDIO_URLS[audioType];

    if (alarmAudioElement) {
      alarmAudioElement.src = src;
      alarmAudioElement.play().catch(err => {
        console.error('播放線上音樂失敗，將自動降級使用離線磬聲。錯誤:', err);
        // 如果線上播放失敗，降級為離線磬聲
        playOfflineBell();
      });
    }
  } else {
    // 2. 播放離線 Web Audio 合成音效
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (audioType === 'offline-bell') {
      playOfflineBell();
    } else if (audioType === 'offline-chime') {
      playOfflineChime();
    }
  }
}

/**
 * 停止播放提醒音效與清除合成計時器
 */
export function stopAlarm() {
  // 停止 HTML5 音訊
  if (alarmAudioElement) {
    alarmAudioElement.pause();
    alarmAudioElement.currentTime = 0;
  }

  // 清除 Web Audio 合成計時器 (同時清除 interval 與 timeout)
  if (alarmInterval) {
    clearInterval(alarmInterval);
    clearTimeout(alarmInterval);
    alarmInterval = null;
  }
}

/**
 * Web Audio 合成：療癒磬聲 (Tibetan Bowl / Bell)
 * 定期敲擊一次，發出長衰減的低頻和聲
 */
function playOfflineBell() {
  const triggerBell = () => {
    if (!audioCtx) return;
    
    const now = audioCtx.currentTime;
    
    // 磬的主基底頻率與和聲頻率
    const baseFreq = 160; 
    const harmonics = [1, 2.7, 4.4, 5.7, 8.1];
    
    // 建立總輸出增益節點
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    // 快速漸入 (Attack)
    masterGain.gain.linearRampToValueAtTime(0.4, now + 0.05);
    // 極緩慢漸弱 (Decay / Release) - 約 7 秒
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 8);
    masterGain.connect(audioCtx.destination);

    // 產生各個諧波音軌
    harmonics.forEach((harmonic, index) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      // 磬聲多為弦波(Sine)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * harmonic, now);
      
      // 諧波振幅衰減，頻率越高振幅越低
      const volume = 0.5 / (index + 1);
      gainNode.gain.setValueAtTime(volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 7);
      
      osc.connect(gainNode);
      gainNode.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 8);
    });
  };

  // 立即敲擊一次，之後每 10 秒敲擊一次
  triggerBell();
  alarmInterval = setInterval(triggerBell, 10000);
}

/**
 * Web Audio 合成：療癒風鈴 (Wind Chimes)
 * 模擬微風吹拂風鈴，隨機敲擊不同金屬管的清脆高音
 */
function playOfflineChime() {
  const frequencies = [587.33, 659.25, 783.99, 880.00, 987.77, 1174.66]; // D5, E5, G5, A5, B5, D6 悅耳五聲音階

  const triggerChime = () => {
    if (!audioCtx) return;

    // 隨機選擇一到二根風鈴管敲擊
    const pipeCount = Math.random() > 0.6 ? 2 : 1;
    
    for (let i = 0; i < pipeCount; i++) {
      const now = audioCtx.currentTime;
      const freq = frequencies[Math.floor(Math.random() * frequencies.length)];
      
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      // 使用三角波(Triangle)模擬金屬敲擊聲
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      // 微幅頻率顫音 (Vibrato) 讓風鈴更自然
      osc.frequency.linearRampToValueAtTime(freq + (Math.random() * 6 - 3), now + 2);

      // 風鈴的敲擊動態
      gainNode.gain.setValueAtTime(0, now);
      // 超快速 Attack
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
      // 清脆衰減 (約 2.5 秒)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 3);
      
      // 低通濾波器，濾掉過於刺耳的高音，使其柔和
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2500, now);

      osc.connect(gainNode);
      gainNode.connect(filter);
      filter.connect(audioCtx.destination);
      
      // 隨機微小延遲播放，模擬物理風吹的參差不齊
      const delay = Math.random() * 0.5;
      osc.start(now + delay);
      osc.stop(now + delay + 3);
    }
  };

  // 每隔隨機時間 (1 到 2.5 秒) 觸發一次風鈴敲擊
  const chimeLoop = () => {
    triggerChime();
    const nextInterval = 1000 + Math.random() * 1500;
    alarmInterval = setTimeout(chimeLoop, nextInterval);
  };
  
  // 啟動風鈴循環
  chimeLoop();
}

