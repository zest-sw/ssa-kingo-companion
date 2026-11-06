import { expect, it } from 'vitest';
import { toastLift } from './toastPlace';

// 1280×640, 토스트 높이 40·폭 400(가운데), 기본 아래 여백 24, 간격 12
const toast = { left: 440, right: 840, height: 40 };

it('넓은 모달 행동 줄을 가리면 행동 줄 위로 올린다', () => {
  const foot = { left: 200, right: 1080, top: 540, bottom: 616 };
  expect(toastLift(toast, foot, 640, 24, 12)).toBe(640 - 540 + 12);
});

it('모달·서랍이 없거나 겹치지 않으면 제자리', () => {
  expect(toastLift(toast, null, 640, 24, 12)).toBe(0);
  // 가운데 작은 확인 모달: 행동 줄이 토스트보다 위에 있다
  expect(toastLift(toast, { left: 440, right: 840, top: 330, bottom: 380 }, 640, 24, 12)).toBe(0);
  // 넓은 창의 서랍: 가로로 비켜 있다
  expect(toastLift({ left: 760, right: 1160, height: 40 }, { left: 1440, right: 1920, top: 880, bottom: 960 }, 960, 24, 12)).toBe(0);
});

it('낮은 노트북의 서랍 행동 줄이 토스트 오른쪽에 걸쳐도 올린다', () => {
  expect(toastLift(toast, { left: 800, right: 1280, top: 578, bottom: 640 }, 640, 24, 12)).toBe(74);
});
