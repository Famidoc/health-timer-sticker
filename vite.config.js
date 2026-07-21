import { defineConfig } from 'vite';

export default defineConfig({
  base: './' // 設定相對路徑，確保部署在 GitHub Pages 子目錄時，靜態資源（CSS、JS）載入路徑正確
});
