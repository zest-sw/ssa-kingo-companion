import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 는 /<저장소명>/ 아래에 올라간다. 배포 빌드에서만 BASE_PATH 로 넘긴다.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // 첫 화면(앱 틀·홈)이 바로 쓰는 모듈만 첫 덩어리에 모은다. 기본 나누기는 다른 화면끼리만 나눠 쓰는 모듈(경험 지도 배치·확대)까지
        // 첫 덩어리가 받는 공용 덩어리에 섞었다. 나머지는 화면 덩어리끼리 자동으로 나눈다.
        codeSplitting: { groups: [{ name: 'app', tags: ['$initial'] }] }
      }
    }
  }
});
