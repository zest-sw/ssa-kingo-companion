import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 는 /<저장소명>/ 아래에 올라간다. 배포 빌드에서만 BASE_PATH 로 넘긴다.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
});
