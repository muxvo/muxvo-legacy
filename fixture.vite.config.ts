/**
 * fixture.vite.config — dev-only：只起 renderer 的纯 Vite dev server（不起 Electron），
 * 服务 fixture.html 供探针 3 视觉回归 golden 截图（muxvo/tools/visual-diff）。
 * 用法：npm run fixture:serve → http://localhost:5199/fixture.html
 */

import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  plugins: [react()],
  define: {
    global: 'globalThis',
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5199,
    strictPort: true,
  },
});
