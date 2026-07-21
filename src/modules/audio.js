import { loadLocalAudioFile } from './storage.js';

let audioCtx = null;
let alarmInterval = null;
let alarmAudioElement = null;
let audioVolume = 0.5; // 全域預設音量

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

/**
 * 動態更新提示音量
 * @param {Number} volume - 音量值 (0.0 到 1.0)
 */
export function setVolume(volume) {
  audioVolume = volume;
  if (alarmAudioElement) {
    alarmAudioElement.volume = volume;
  }
}

let localAudioUrl = null;

/**
 * 開始播放提醒音樂或合成音效
 * @param {Object} settings - 包含音訊類型與自訂網址的設定物件
 * @param {Boolean} isTest - 是否為測試/試聽播放 (若是，則加載失敗時直接拋出錯誤而不降級播放磬聲)
 */
export async function playAlarm(settings, isTest = false) {
  stopAlarm(); // 確保先停止上一次 the 播放

  const { audioType } = settings;
  const volume = settings.volume !== undefined ? settings.volume : audioVolume;

  // 更新播放器的音量
  if (alarmAudioElement) {
    alarmAudioElement.volume = volume;
  }

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
        await alarmAudioElement.play();
      }
    } catch (err) {
      console.error('讀取或播放本地音樂失敗，錯誤:', err);
      if (isTest) throw err;
      playOfflineBell(volume);
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
      playOfflineBell(volume);
    } else if (audioType === 'offline-chime') {
      playOfflineChime(volume);
    } else if (audioType === 'offline-rain') {
      playOfflineRain(volume);
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

  // 清除 Web Audio 合成計時器或自訂節點
  if (alarmInterval) {
    if (typeof alarmInterval.stop === 'function') {
      alarmInterval.stop();
    } else {
      clearInterval(alarmInterval);
      clearTimeout(alarmInterval);
    }
    alarmInterval = null;
  }
}

/**
 * Web Audio 合成：大自然雨聲 (Rain Noise)
 * 使用白噪音搭配雙濾波器與 LFO 音量波動，模擬真實的戶外降雨聲
 * @param {Number} volume - 音量乘數 (0.0 到 1.0)
 */
function playOfflineRain(volume = 0.5) {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;
  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  // 1. 生成白噪音
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  // 2. 建立濾波器
  // 低通濾波器：切除刺耳的高頻沙沙聲，使其圓潤
  const lowpass = audioCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(800, now);

  // 帶通/峰值濾波器：模擬雨水落地的低頻撞擊共鳴
  const peak = audioCtx.createBiquadFilter();
  peak.type = 'peaking';
  peak.frequency.setValueAtTime(150, now);
  peak.Q.setValueAtTime(1.0, now);
  peak.gain.setValueAtTime(6, now);

  // 3. 建立音量控制與 LFO 動態調變 (模擬雨勢受風吹的自然起伏)
  const mainGain = audioCtx.createGain();
  mainGain.gain.setValueAtTime(0.25 * volume, now);

  const lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.12, now); // 每 8.3 秒起伏一次

  const lfoGain = audioCtx.createGain();
  lfoGain.gain.setValueAtTime(0.08 * volume, now);

  lfo.connect(lfoGain);
  lfoGain.connect(mainGain.gain);

  // 連結節點
  noiseSource.connect(lowpass);
  lowpass.connect(peak);
  peak.connect(mainGain);
  mainGain.connect(audioCtx.destination);

  // 啟動
  lfo.start(now);
  noiseSource.start(now);

  // 包裝停止介面給 stopAlarm
  alarmInterval = {
    stop: () => {
      try {
        noiseSource.stop();
        lfo.stop();
      } catch (e) {}
    }
  };
}

/**
 * Web Audio 合成：療癒磬聲 (Tibetan Bowl / Bell)
 * 定期敲擊一次，發出長衰減的低頻和聲
 * @param {Number} volume - 音量乘數 (0.0 到 1.0)
 */
function playOfflineBell(volume = 0.5) {
  const triggerBell = () => {
    if (!audioCtx) return;
    
    const now = audioCtx.currentTime;
    
    // 磬的主基底頻率與和聲頻率
    const baseFreq = 160; 
    const harmonics = [1, 2.7, 4.4, 5.7, 8.1];
    
    // 建立總輸出增益節點
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    // 快速漸入 (Attack) - 套用音量調整
    masterGain.gain.linearRampToValueAtTime(0.4 * volume, now + 0.05);
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
      const baseVol = 0.5 / (index + 1);
      gainNode.gain.setValueAtTime(baseVol, now);
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
 * @param {Number} volume - 音量乘數 (0.0 到 1.0)
 */
function playOfflineChime(volume = 0.5) {
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
      // 超快速 Attack - 套用音量調整
      gainNode.gain.linearRampToValueAtTime(0.15 * volume, now + 0.01);
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

