import { describe, expect, it } from 'vitest';
import { rec } from '../fixtures.test-util';
import { answerReady, BUNDLE_MAX, bundleText, missingStar, starAnswer, togglePick } from './answer';

describe('starAnswer', () => {
  it('상황·역할·한 일·결과·배운 점·다음 순서로 학생 글을 한 문장씩 잇는다', () => {
    const a = starAnswer({ next: '시각화 스터디 찾아보기', situation: '24시간 교내 해커톤, 4인 팀', role: '데이터 전처리를 맡았어요', action: '결측치 정리 코드를 만들었다.', result: '본선 진출', learned: '데이터 품질이 먼저다' });
    expect(a).toBe('24시간 교내 해커톤, 4인 팀. 데이터 전처리를 맡았어요. 결측치 정리 코드를 만들었다. 그 결과 본선 진출. 데이터 품질이 먼저다. 시각화 스터디 찾아보기.');
  });
  it('빈 칸은 건너뛰고, 결과가 이미 "결과"로 시작하면 이음말을 붙이지 않는다', () => {
    expect(starAnswer({ role: ' ', result: '결과는 3위였다' })).toBe('결과는 3위였다.');
    expect(starAnswer({})).toBe('');
  });
  it('마침표 뒤는 늘 한 칸: 붙여 쓴 문장은 띄우고, 겹친 공백·줄바꿈은 하나로, 숫자 소수점은 그대로', () => {
    expect(starAnswer({ action: '아이디어를 제안했다.그 뒤 발표했다.', result: '평점 3.5점,  상위권\n진출', next: '다시   해 볼래요' })).toBe('아이디어를 제안했다. 그 뒤 발표했다. 그 결과 평점 3.5점, 상위권 진출. 다시 해 볼래요.');
  });
});

describe('answerReady', () => {
  it('STAR 칸이 하나라도 있으면 답변을 만들고(배운 점만으로는 안 된다), 빈 STAR 칸을 순서대로 알려 준다', () => {
    expect(answerReady({ action: 'a', learned: 'l' })).toBe(true);
    expect(answerReady({ learned: 'l', next: 'n' })).toBe(false);
    expect(missingStar({ role: 'r', action: ' ' })).toEqual(['situation', 'action', 'result']);
  });
});

describe('togglePick · bundleText', () => {
  it('누르면 담고 다시 누르면 뺀다. 다섯 개를 넘겨 담지 않는다', () => {
    expect(togglePick(['a'], 'b')).toEqual(['a', 'b']);
    expect(togglePick(['a', 'b'], 'a')).toEqual(['b']);
    const full = Array.from({ length: BUNDLE_MAX }, (_, i) => `r${i}`);
    expect(togglePick(full, 'x')).toBe(full);
  });
  it('제목 줄과 답변 문단을 빈 줄로 나눈다', () => {
    const t = bundleText([rec('a', { title: '해커톤', semester: '2026-2', verification: 'school', note: '코드를 짰다' }), rec('b', { title: '스터디', semester: '2026-여름', quote: '꾸준함' })]);
    expect(t).toBe('해커톤 (2026-2학기 · 학교 확인)\n코드를 짰다.\n\n스터디 (2026 여름 · 직접 입력)\n꾸준함.');
  });
});
