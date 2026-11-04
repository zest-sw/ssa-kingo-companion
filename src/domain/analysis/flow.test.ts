import { describe, expect, it } from 'vitest';
import { SEED_RECORDS } from '../../data/seed';
import { rec } from '../fixtures.test-util';
import { buildFlow, flowCountNote, flowStory, semesterPick, topGroups } from './flow';
import { semesterAxis } from './semester';

describe('관심 흐름 · 길과 이야기', () => {
  it('학기마다 가장 많이 한 분야, 같으면 앞 학기를 이어 가고 빈 학기는 null', () => {
    const rows = buildFlow([
      rec('a', { semester: '2026-1', field: 'dev' }),
      rec('b', { semester: '2026-2', field: 'dev' }), rec('c', { semester: '2026-2', field: 'ai' }),
      rec('d', { semester: '2027-1', field: 'ai' }), rec('e', { semester: '2027-1', field: 'ai' })
    ], ['2026-1', '2026-여름', '2026-2', '2027-1']);
    expect(topGroups(rows)).toEqual(['dev', null, 'dev', 'ai']);
  });

  it('해마다 묶어 시작 → 넓힘 → 모임, 같은 분야가 이어지면 한 단', () => {
    const rows = buildFlow([
      rec('a', { semester: '2024-1', field: 'dev' }), rec('b', { semester: '2025-1', field: 'dev' }),
      rec('c', { semester: '2026-1', field: 'data' }), rec('d', { semester: '2027-1', field: 'product' })
    ], ['2024-1', '2025-1', '2026-1', '2027-1']);
    expect(flowStory(rows).map(s => `${s.years} ${s.text}`)).toEqual(['2024~2025년 개발로 시작', '2026년 AI·데이터로 넓힘', '2027년 창업·기획에 모임']);
  });

  it('단이 넷 이상이면 처음·끝과 가운데 가장 많은 단만 남긴다', () => {
    const rows = buildFlow([
      rec('a', { semester: '2023-1', field: 'dev' }), rec('b', { semester: '2024-1', field: 'mentor' }),
      rec('c', { semester: '2025-1', field: 'ai' }), rec('c2', { semester: '2025-2', field: 'ai' }), rec('d', { semester: '2026-1', field: 'product' })
    ], ['2023-1', '2024-1', '2025-1', '2025-2', '2026-1']);
    expect(flowStory(rows).map(s => s.group)).toEqual(['dev', 'ai', 'plan']);
  });

  it('한 해뿐이면 한 단, 기록이 없으면 이야기도 없다', () => {
    expect(flowStory(buildFlow([rec('a', { field: 'product' })], ['2026-2'])).map(s => s.text)).toEqual(['창업·기획으로 시작']);
    expect(flowStory(buildFlow([], ['2026-2']))).toEqual([]);
  });

  it('셈 한 줄과 학기 대표 활동(에너지 오른 기록 먼저)', () => {
    const rs = [rec('a', { field: 'dev' }), rec('b', { field: 'dev', energy: 'up' }), rec('c', { field: 'ai' })];
    const [row] = buildFlow(rs, ['2026-2']);
    expect(flowCountNote([row])).toBe('기록 3개를 학기별로 셌어요');
    expect(semesterPick(row, 'dev', rs)?.id).toBe('b');
    expect(semesterPick(buildFlow([], ['2026-2'])[0], null, rs)).toBeUndefined();
  });

  it('예시 학생: 2024 개발 → 2025 AI·데이터 → 2026 창업·기획', () => {
    const rows = buildFlow(SEED_RECORDS, semesterAxis(SEED_RECORDS, '2025-1', '2026-2'));
    expect(flowStory(rows).map(s => `${s.years} ${s.text}`)).toEqual(['2024년 개발로 시작', '2025년 AI·데이터로 넓힘', '2026년 창업·기획에 모임']);
  });
});
