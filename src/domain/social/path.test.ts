import { describe, expect, it } from 'vitest';
import { canFollow, pathNodes } from './path';

describe('pathNodes', () => {
  it('테크 트리와 같은 규칙으로 심화 단계 칸을 정한다', () => {
    const nodes = pathNodes([
      { title: '학습 멘토링 · 멘티', field: 'mentor', when: '1-1' },
      { title: '앱 개발 동아리', field: 'dev', when: '1-2' },
      { title: '학습 멘토링 · 멘토', field: 'mentor', when: '2-1' },
      { title: '교내 해커톤 대상', field: 'dev', when: '3-2', level: 3 }
    ]);
    expect(nodes.map(n => n.col)).toEqual([0, 1, 2, 2]);
    expect(nodes[0].id).toBe('step-0');
  });
});

describe('canFollow', () => {
  it('공개한 경로가 있어야 따라 볼 수 있다', () => {
    expect(canFollow({ path: [{ title: 'AI 특강', field: 'ai', when: '2-1' }] })).toBe(true);
    expect(canFollow({ path: [] })).toBe(false);
    expect(canFollow({})).toBe(false);
  });
});
