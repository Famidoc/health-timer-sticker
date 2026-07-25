import { saveStickers, loadStickers } from './storage.js';

let stickers = [];
let maxZIndex = 10;

// 行動端當前的篩選條件
let currentFilterColor = 'all';
let currentSearchQuery = '';

/**
 * 初始化便利貼模組
 */
export function initStickers() {
  stickers = loadStickers();
  
  // 若儲存空間為空，自動恢復預設便利貼
  if (!stickers || stickers.length === 0) {
    stickers = [
      {
        id: 'sticker_default_1',
        type: 'text',
        content: '7/26(日)\nPO【健康計時器+桌面便利貼】\n\nhttps://docs.google.com/document/d/1SKmMLTl2ybqN2RhgQMeBIgP9W7xSp_W27YWvYInTi...',
        todos: [],
        x: 40,
        y: 420,
        width: 250,
        height: 220,
        color: 'blue',
        zIndex: 10
      },
      {
        id: 'sticker_default_2',
        type: 'todo',
        content: '',
        todos: [
          { id: 'todo_1', text: '待辦項目 1', done: true },
          { id: 'todo_2', text: '再加', done: false },
          { id: 'todo_3', text: '可拖動排序！', done: false }
        ],
        x: 310,
        y: 420,
        width: 250,
        height: 220,
        color: 'pink',
        zIndex: 11
      }
    ];
    saveStickers(stickers);
  }

  // 計算當前的最大 zIndex，避免重疊順序錯亂
  if (stickers.length > 0) {
    maxZIndex = Math.max(...stickers.map(s => s.zIndex || 10)) + 1;
  }
  
  renderAll();
  setupEvents();
}

/**
 * 取得當前所有貼紙資料
 */
export function getStickers() {
  return stickers;
}

/**
 * 設定全域事件監聽（如行動版的搜尋與過濾）
 */
function setupEvents() {
  // 電腦版新增按鈕
  const btnAdd = document.getElementById('btn-add-sticker');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => createNewSticker());
  }

  // 手機版新增按鈕
  const btnMobileAdd = document.getElementById('btn-mobile-add');
  if (btnMobileAdd) {
    btnMobileAdd.addEventListener('click', () => createNewSticker());
  }

  // 手機版搜尋
  const mobileSearch = document.getElementById('mobile-search');
  if (mobileSearch) {
    mobileSearch.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.toLowerCase();
      renderMobileGrid();
    });
  }

  // 手機版顏色篩選
  const colorFilters = document.querySelectorAll('.color-filter');
  colorFilters.forEach(filter => {
    filter.addEventListener('click', (e) => {
      colorFilters.forEach(f => f.classList.remove('active'));
      e.target.classList.add('active');
      currentFilterColor = e.target.getAttribute('data-color');
      renderMobileGrid();
    });
  });

  // 監聽視窗縮放，如果是大螢幕且有便利貼超出邊界，做一下適當的位移
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      let changed = false;
      stickers.forEach(s => {
        const maxX = window.innerWidth - (s.width || 250);
        const maxY = window.innerHeight - (s.height || 220);
        if (s.x > maxX && maxX > 0) { s.x = Math.max(10, maxX - 20); changed = true; }
        if (s.y > maxY && maxY > 0) { s.y = Math.max(10, maxY - 20); changed = true; }
      });
      if (changed) {
        saveStickers(stickers);
        renderDesktopContainer();
      }
    }
  });
}

/**
 * 建立一個全新便利貼並渲染
 */
export function createNewSticker() {
  // 隨機在畫面中央偏左上位置產生，避免重疊
  const randomOffset = Math.floor(Math.random() * 60) - 30;
  const x = Math.max(40, Math.floor(window.innerWidth / 2 - 125) + randomOffset);
  const y = Math.max(40, Math.floor(window.innerHeight / 2 - 110) + randomOffset);

  const newSticker = {
    id: 'sticker_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    type: 'text', // 'text' 或 'todo'
    content: '寫點東西吧...',
    todos: [
      { id: 'todo_' + Date.now() + '_1', text: '待辦項目 1', done: false }
    ],
    x: x,
    y: y,
    width: 250,
    height: 220,
    color: ['yellow', 'pink', 'blue', 'green', 'purple'][Math.floor(Math.random() * 5)],
    zIndex: ++maxZIndex
  };

  stickers.push(newSticker);
  saveStickers(stickers);
  renderAll();
}

/**
 * 渲染電腦與手機雙版本視圖
 */
export function renderAll() {
  renderDesktopContainer();
  renderMobileGrid();
}

/**
 * 渲染電腦端桌面視圖
 */
function renderDesktopContainer() {
  const container = document.getElementById('sticker-container');
  if (!container) return;
  container.innerHTML = '';

  stickers.forEach(s => {
    const el = createStickerDOM(s, false);
    container.appendChild(el);
  });
}

/**
 * 渲染手機端卡片網格視圖
 */
function renderMobileGrid() {
  const grid = document.getElementById('mobile-sticker-grid');
  if (!grid) return;
  grid.innerHTML = '';

  // 篩選與搜尋
  const filtered = stickers.filter(s => {
    // 顏色過濾
    const matchColor = (currentFilterColor === 'all' || s.color === currentFilterColor);
    
    // 文字搜尋
    let matchText = false;
    if (s.type === 'text') {
      matchText = s.content.toLowerCase().includes(currentSearchQuery);
    } else {
      matchText = s.todos.some(t => t.text.toLowerCase().includes(currentSearchQuery));
    }
    
    return matchColor && (currentSearchQuery === '' || matchText);
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="text-align:center; color:var(--text-secondary); padding:40px 0; font-size:0.9rem;">沒有找到符合的便利貼</div>`;
    return;
  }

  filtered.forEach(s => {
    const el = createStickerDOM(s, true);
    grid.appendChild(el);
  });
}

/**
 * 建立便利貼的 HTML 元素
 * @param {Object} s - 便利貼資料
 * @param {Boolean} isMobile - 是否為行動端模式
 */
function createStickerDOM(s, isMobile) {
  const sticker = document.createElement('div');
  sticker.className = `sticker note-${s.color}`;
  sticker.id = s.id;
  
  if (!isMobile) {
    sticker.style.left = `${s.x}px`;
    sticker.style.top = `${s.y}px`;
    sticker.style.width = `${s.width}px`;
    sticker.style.height = `${s.height}px`;
    sticker.style.zIndex = s.zIndex || 10;
  }

  // 標頭區 (顏色選擇器 + 模式切換 + 刪除)
  const header = document.createElement('div');
  header.className = 'sticker-header';
  
  const colors = ['yellow', 'pink', 'blue', 'green', 'purple'];
  const colorSelector = document.createElement('div');
  colorSelector.className = 'sticker-color-selector';
  
  colors.forEach(col => {
    const dot = document.createElement('div');
    dot.className = `color-dot ${col}`;
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      s.color = col;
      saveStickers(stickers);
      renderAll();
    });
    colorSelector.appendChild(dot);
  });
  
  const actions = document.createElement('div');
  actions.className = 'sticker-actions';
  
  // 模式切換按鈕 (文字 / 清單)
  const btnType = document.createElement('button');
  btnType.className = 'sticker-btn';
  btnType.title = s.type === 'text' ? '切換為待辦清單' : '切換為純文字';
  btnType.innerHTML = s.type === 'text' ? '📋' : '✍';
  btnType.addEventListener('click', (e) => {
    e.stopPropagation();
    s.type = s.type === 'text' ? 'todo' : 'text';
    // 若轉換為 todo 且為空，給予預設值
    if (s.type === 'todo' && s.todos.length === 0) {
      s.todos = [{ id: 'todo_' + Date.now(), text: '待辦項目 1', done: false }];
    }
    saveStickers(stickers);
    renderAll();
  });
  
  // 刪除按鈕
  const btnDelete = document.createElement('button');
  btnDelete.className = 'sticker-btn';
  btnDelete.title = '刪除便利貼';
  btnDelete.innerHTML = '🗑';
  btnDelete.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm('確定要刪除這張便利貼嗎？')) {
      stickers = stickers.filter(item => item.id !== s.id);
      saveStickers(stickers);
      renderAll();
    }
  });

  actions.appendChild(btnType);
  actions.appendChild(btnDelete);
  header.appendChild(colorSelector);
  header.appendChild(actions);
  sticker.appendChild(header);

  // 內容編輯區
  const body = document.createElement('div');
  body.className = 'sticker-body';

  if (s.type === 'text') {
    // 渲染純文字 (支援 markdown 粗體與斜體)
    const contentDiv = document.createElement('div');
    contentDiv.className = 'sticker-content';
    contentDiv.innerHTML = formatMarkdown(s.content);
    
    const textarea = document.createElement('textarea');
    textarea.className = 'sticker-textarea';
    textarea.value = s.content;

    // 電腦版點擊編輯，手機版也點擊編輯
    const startEdit = () => {
      contentDiv.style.display = 'none';
      textarea.style.display = 'block';
      textarea.focus();
      // 將游標移到最後
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    };

    contentDiv.addEventListener('click', startEdit);

    const finishEdit = () => {
      s.content = textarea.value;
      contentDiv.innerHTML = formatMarkdown(s.content);
      contentDiv.style.display = 'block';
      textarea.style.display = 'none';
      saveStickers(stickers);
      // 若是手機端更新，同步渲染手機網格與電腦視圖
      renderAll();
    };

    textarea.addEventListener('blur', finishEdit);
    // 按 Esc 放棄編輯或完成編輯
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        textarea.blur();
      }
    });

    body.appendChild(contentDiv);
    body.appendChild(textarea);
  } else {
    // 待辦清單模式
    const todoList = document.createElement('ul');
    todoList.className = 'todo-list';

    s.todos.forEach((todo, idx) => {
      const todoItem = document.createElement('li');
      todoItem.className = `todo-item ${todo.done ? 'done' : ''}`;

      // 拖動手柄
      const dragHandle = document.createElement('span');
      dragHandle.className = 'todo-drag-handle';
      dragHandle.innerHTML = '⋮⋮';
      dragHandle.title = '按住拖動排序';

      // HTML5 Drag & Drop 事件
      dragHandle.addEventListener('mousedown', () => {
        todoItem.draggable = true;
      });

      dragHandle.addEventListener('mouseup', () => {
        todoItem.draggable = false;
      });

      todoItem.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', JSON.stringify({ stickerId: s.id, fromIdx: idx }));
        e.dataTransfer.effectAllowed = 'move';
        todoItem.classList.add('dragging');
      });

      todoItem.addEventListener('dragend', (e) => {
        e.stopPropagation();
        todoItem.draggable = false;
        todoItem.classList.remove('dragging');
        todoList.querySelectorAll('.todo-item').forEach(item => {
          item.classList.remove('drag-over-top', 'drag-over-bottom');
        });
      });

      todoItem.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';

        const rect = todoItem.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          todoItem.classList.add('drag-over-top');
          todoItem.classList.remove('drag-over-bottom');
        } else {
          todoItem.classList.add('drag-over-bottom');
          todoItem.classList.remove('drag-over-top');
        }
      });

      todoItem.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        todoItem.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      todoItem.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        todoItem.classList.remove('drag-over-top', 'drag-over-bottom');

        let data;
        try {
          data = JSON.parse(e.dataTransfer.getData('text/plain'));
        } catch (err) {
          return;
        }

        if (data && data.stickerId === s.id && typeof data.fromIdx === 'number') {
          const fromIdx = data.fromIdx;
          const rect = todoItem.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          let targetIdx = e.clientY < midY ? idx : idx + 1;

          if (fromIdx !== targetIdx && fromIdx !== targetIdx - 1) {
            const [movedTodo] = s.todos.splice(fromIdx, 1);
            if (fromIdx < targetIdx) targetIdx--;
            s.todos.splice(targetIdx, 0, movedTodo);
            saveStickers(stickers);
            renderAll();
          }
        }
      });

      // 觸控裝置 (Touch devices) 拖動排序支援
      dragHandle.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        const startIdx = idx;
        todoItem.classList.add('dragging');
        
        let currentTargetItem = null;
        let dropPosition = 'top';

        const onTouchMove = (moveEvt) => {
          if (moveEvt.cancelable) moveEvt.preventDefault();
          const moveTouch = moveEvt.touches[0];
          const elem = document.elementFromPoint(moveTouch.clientX, moveTouch.clientY);
          if (!elem) return;

          const targetItem = elem.closest('.todo-item');
          
          todoList.querySelectorAll('.todo-item').forEach(item => {
            if (item !== todoItem) {
              item.classList.remove('drag-over-top', 'drag-over-bottom');
            }
          });

          if (targetItem && targetItem !== todoItem && todoList.contains(targetItem)) {
            const rect = targetItem.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            currentTargetItem = targetItem;
            if (moveTouch.clientY < midY) {
              dropPosition = 'top';
              targetItem.classList.add('drag-over-top');
            } else {
              dropPosition = 'bottom';
              targetItem.classList.add('drag-over-bottom');
            }
          } else {
            currentTargetItem = null;
          }
        };

        const onTouchEnd = () => {
          document.removeEventListener('touchmove', onTouchMove);
          document.removeEventListener('touchend', onTouchEnd);
          todoItem.classList.remove('dragging');

          todoList.querySelectorAll('.todo-item').forEach(item => {
            item.classList.remove('drag-over-top', 'drag-over-bottom');
          });

          if (currentTargetItem) {
            const targetIdx = Array.from(todoList.children).indexOf(currentTargetItem);
            if (targetIdx !== -1 && targetIdx < s.todos.length) {
              let finalIdx = dropPosition === 'top' ? targetIdx : targetIdx + 1;
              if (startIdx !== finalIdx && startIdx !== finalIdx - 1) {
                const [movedTodo] = s.todos.splice(startIdx, 1);
                if (startIdx < finalIdx) finalIdx--;
                s.todos.splice(finalIdx, 0, movedTodo);
                saveStickers(stickers);
                renderAll();
              }
            }
          }
        };

        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
      });

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = todo.done;
      checkbox.addEventListener('change', () => {
        todo.done = checkbox.checked;
        todoItem.className = `todo-item ${todo.done ? 'done' : ''}`;
        saveStickers(stickers);
        // 更新另一端視圖
        renderAll();
      });

      const todoText = document.createElement('div');
      todoText.className = 'todo-text';
      todoText.contentEditable = true;
      todoText.innerText = todo.text;
      todoText.addEventListener('blur', () => {
        todo.text = todoText.innerText;
        // 如果內容為空且不是最後一項，則刪除該項目
        if (todo.text.trim() === '' && s.todos.length > 1) {
          s.todos.splice(idx, 1);
        }
        saveStickers(stickers);
        renderAll();
      });

      todoText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          todoText.blur();
          // 新增一個新的 todo 項目到它後面
          s.todos.splice(idx + 1, 0, {
            id: 'todo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 3),
            text: '',
            done: false
          });
          saveStickers(stickers);
          renderAll();
          // 聚焦至新產生的輸入項目
          setTimeout(() => {
            const nextStickerDOM = document.getElementById(s.id);
            if (nextStickerDOM) {
              const editableItems = nextStickerDOM.querySelectorAll('.todo-text');
              if (editableItems[idx + 1]) {
                editableItems[idx + 1].focus();
              }
            }
          }, 50);
        }
      });

      const btnDeleteTodo = document.createElement('button');
      btnDeleteTodo.className = 'todo-item-delete-btn';
      btnDeleteTodo.innerHTML = '&times;';
      btnDeleteTodo.title = '刪除此項目';
      btnDeleteTodo.addEventListener('mousedown', (e) => {
        // 使用 mousedown 以防止與便利貼的 drag 邏輯交互衝突
        e.stopPropagation();
      });
      btnDeleteTodo.addEventListener('click', (e) => {
        e.stopPropagation();
        if (s.todos.length > 1) {
          s.todos.splice(idx, 1);
        } else {
          s.todos[0].text = '';
          s.todos[0].done = false;
        }
        saveStickers(stickers);
        renderAll();
      });

      todoItem.appendChild(dragHandle);
      todoItem.appendChild(checkbox);
      todoItem.appendChild(todoText);
      todoItem.appendChild(btnDeleteTodo);
      todoList.appendChild(todoItem);
    });

    // 「+ 新增項目」按鈕
    const btnAddTodo = document.createElement('div');
    btnAddTodo.className = 'todo-item';
    btnAddTodo.style.opacity = '0.5';
    btnAddTodo.style.cursor = 'pointer';
    btnAddTodo.innerHTML = `<span style="font-size:1.2rem;">+</span> <span style="font-size:0.9rem;">新增項目</span>`;
    btnAddTodo.addEventListener('click', () => {
      s.todos.push({
        id: 'todo_' + Date.now(),
        text: '',
        done: false
      });
      saveStickers(stickers);
      renderAll();
      // 聚焦至最新項目
      setTimeout(() => {
        const currentStickerDOM = document.getElementById(s.id);
        if (currentStickerDOM) {
          const editableItems = currentStickerDOM.querySelectorAll('.todo-text');
          if (editableItems.length > 0) {
            editableItems[editableItems.length - 1].focus();
          }
        }
      }, 50);
    });

    todoList.appendChild(btnAddTodo);
    body.appendChild(todoList);
  }

  sticker.appendChild(body);

  // 電腦版才有的功能：拖曳、點擊提升層次、右下角縮放
  if (!isMobile) {
    // 1. 提升層級 zIndex
    sticker.addEventListener('mousedown', () => {
      if (s.zIndex !== maxZIndex) {
        s.zIndex = ++maxZIndex;
        sticker.style.zIndex = s.zIndex;
        saveStickers(stickers);
      }
    });

    // 2. 拖曳邏輯
    sticker.addEventListener('mousedown', (e) => {
      // 如果點擊到按鈕、輸入框、縮放點、超連結、待辦項目拖動手柄或刪除按鈕，就不觸發整張便利貼拖曳
      if (
        e.target.closest('.sticker-actions') || 
        e.target.closest('.sticker-color-selector') ||
        e.target.closest('.sticker-resizer') ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.getAttribute('contenteditable') === 'true' ||
        e.target.classList.contains('todo-checkbox') ||
        e.target.closest('a') ||
        e.target.closest('.todo-item-delete-btn') ||
        e.target.closest('.todo-drag-handle')
      ) {
        return;
      }
      
      e.preventDefault();
      
      const startX = e.clientX;
      const startY = e.clientY;
      const initialLeft = s.x;
      const initialTop = s.y;

      const onMouseMove = (moveEvt) => {
        const dx = moveEvt.clientX - startX;
        const dy = moveEvt.clientY - startY;
        
        let newX = initialLeft + dx;
        let newY = initialTop + dy;

        // 邊界限制
        const maxX = window.innerWidth - s.width;
        const maxY = window.innerHeight - s.height;
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        sticker.style.left = `${newX}px`;
        sticker.style.top = `${newY}px`;
        
        s.x = newX;
        s.y = newY;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        saveStickers(stickers);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // 3. 縮放邏輯
    const resizer = document.createElement('div');
    resizer.className = 'sticker-resizer';
    
    resizer.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const startWidth = s.width;
      const startHeight = s.height;
      const startX = e.clientX;
      const startY = e.clientY;

      const onMouseMove = (moveEvt) => {
        const dx = moveEvt.clientX - startX;
        const dy = moveEvt.clientY - startY;

        let newWidth = startWidth + dx;
        let newHeight = startHeight + dy;

        // 最小尺寸限制
        newWidth = Math.max(200, newWidth);
        newHeight = Math.max(180, newHeight);

        // 最大尺寸限制 (避免超出螢幕)
        newWidth = Math.min(newWidth, window.innerWidth - s.x);
        newHeight = Math.min(newHeight, window.innerHeight - s.y);

        sticker.style.width = `${newWidth}px`;
        sticker.style.height = `${newHeight}px`;

        s.width = newWidth;
        s.height = newHeight;
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        saveStickers(stickers);
        renderMobileGrid(); // 同步更新手機版
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    sticker.appendChild(resizer);
  }

  return sticker;
}

function formatMarkdown(text) {
  if (!text) return '寫點東西吧...';
  
  // 1. 逸出 HTML 字元防禦 XSS
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. 轉換網址為可點擊超連結 (需在轉義 HTML 之後，以防生成的 <a> 標籤被轉義)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  escaped = escaped.replace(urlRegex, (url) => {
    // 移除結尾的標點符號，避免點號句號被包在網址內
    let cleanUrl = url;
    let suffix = '';
    const match = url.match(/([.,!?;)]+)$/);
    if (match) {
      cleanUrl = url.substring(0, url.length - match[0].length);
      suffix = match[0];
    }
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="sticker-link">${cleanUrl}</a>${suffix}`;
  });

  // 3. 轉換粗體與斜體
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  return escaped;
}
