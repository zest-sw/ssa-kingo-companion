// #/_kit 다이어그램 예시 데이터. 화면 데이터가 아니라 부품 모양을 보는 용도다.
import type { DotItem, FunnelStep, GanttRow, GridAxisItem, LoopNode, Segment, TimelineItem } from '../../components';
import type { DiagramTone } from '../../components';

export const LONG_LABEL = '2026 하계 글로벌 소프트웨어 융합 리더십 집중 캠프 및 산학 협력 프로젝트 발표회';
export const TODAY = '2026-11-03';
export const RANGE_14 = { start: '2026-11-01', end: '2026-11-14' };
export const SEMESTER = { start: '2026-09-01', end: '2026-12-20' };

export const TIMELINE: TimelineItem[] = [
  { id: 't-tutor', date: '2026-11-03', label: 'SW 튜터 사전 설문', mark: 'diamond', tone: 'accent' },
  { id: 't-retro', date: '2026-11-03', label: '가을 데이터 해커톤 회고', mark: 'ring', tone: 'mentor' },
  { id: 't-club', date: '2026-11-06', label: 'AI 프로젝트 학회 모임', tone: 'ai' },
  { id: 't-swm', date: '2026-11-08', label: 'SW 마에스트로 신청', mark: 'diamond', tone: 'dev' },
  { id: 't-hack', date: '2026-11-10', end: '2026-11-12', label: '교내 해커톤', tone: 'dev' }
];
export const TIMELINE_LONG: TimelineItem[] = [
  { id: 'tl-1', date: '2026-11-01', label: LONG_LABEL, mark: 'diamond', tone: 'accent' },
  { id: 'tl-2', date: '2026-11-14', label: LONG_LABEL, tone: 'global' },
  { id: 'tl-3', date: '2026-11-05', end: '2026-11-13', label: LONG_LABEL, tone: 'plan' }
];
const TONES: DiagramTone[] = ['dev', 'ai', 'plan', 'mentor', 'global'];
const MARKS = ['dot', 'ring', 'diamond'] as const;
export const TIMELINE_MANY: TimelineItem[] = Array.from({ length: 24 }, (_, i) => ({
  id: `tm-${i}`, date: `2026-11-${String(1 + ((i * 5) % 14)).padStart(2, '0')}`, label: `예시 일정 ${i + 1}`, mark: MARKS[i % 3], tone: TONES[i % 5]
}));

export const GANTT: GanttRow[] = [
  { id: 'g-swm', label: 'SW 마에스트로', start: '2026-10-20', end: '2026-11-08', state: 'prep', tone: 'dev', deadline: '2026-11-08', result: '2026-11-30' },
  { id: 'g-tutor', label: 'SW 튜터', start: '2026-10-28', end: '2026-11-03', state: 'prep', tone: 'mentor', deadline: '2026-11-03' },
  { id: 'g-club', label: 'AI 프로젝트 학회', start: '2026-09-04', end: '2026-12-10', state: 'active', tone: 'ai' },
  { id: 'g-hack', label: '가을 데이터 해커톤', start: '2026-10-09', end: '2026-10-11', state: 'done', tone: 'ai' },
  { id: 'g-camp', label: '글로벌 리더십 캠프', start: '2026-08-10', end: '2026-09-12', state: 'done', tone: 'global', result: '2026-10-30' }
];
export const GANTT_LONG: GanttRow[] = [
  { id: 'gl-1', label: LONG_LABEL, start: '2026-09-01', end: '2026-12-20', state: 'active', tone: 'plan', deadline: '2026-09-01', result: '2026-12-20' }
];
export const GANTT_MANY: GanttRow[] = Array.from({ length: 14 }, (_, i) => {
  const s = 1 + i * 7;
  const start = new Date(Date.UTC(2026, 8, s)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(2026, 8, s + 10 + (i % 4) * 6)).toISOString().slice(0, 10);
  return { id: `gm-${i}`, label: `예시 활동 ${i + 1}`, start, end, state: (['prep', 'active', 'done'] as const)[i % 3], tone: TONES[i % 5], deadline: i % 2 ? end : undefined };
});

export const GRID_ROWS: GridAxisItem[] = [
  { id: 'dev', label: '개발' }, { id: 'ai', label: 'AI·데이터' }, { id: 'plan', label: '창업·기획' }, { id: 'mentor', label: '멘토링' }, { id: 'global', label: '글로벌' }
];
export const GRID_COLS: GridAxisItem[] = [
  { id: '2025-1', label: '2025-1학기' }, { id: '2025-2', label: '2025-2학기' }, { id: '2026-1', label: '2026-1학기' }, { id: '2026-여름', label: '2026 여름' }, { id: '2026-2', label: '2026-2학기' }
];
export const GRID: DotItem[] = [
  { id: 'e1', row: 'plan', col: '2026-1', filled: false, label: '팀 서비스 개선안', tone: 'plan' },
  { id: 'e2', row: 'plan', col: '2026-1', filled: false, label: '사용자 인터뷰 과제', tone: 'plan' },
  { id: 'e3', row: 'plan', col: '2026-여름', filled: false, label: '리서치 스터디', tone: 'plan' },
  { id: 'e4', row: 'plan', col: '2026-2', filled: true, label: '교내 디자인 해커톤', tone: 'plan' },
  { id: 'e7', row: 'ai', col: '2026-2', filled: true, label: '가을 데이터 해커톤', tone: 'ai' },
  { id: 'e8', row: 'dev', col: '2025-2', filled: true, label: '웹 개발 동아리', tone: 'dev' }
];
export const GRID_LONG_ROWS: GridAxisItem[] = [{ id: 'x', label: LONG_LABEL }, { id: 'y', label: '글로벌' }];
export const GRID_LONG_COLS: GridAxisItem[] = [{ id: 'a', label: '2026 여름 계절 학기 집중 과정' }, { id: 'b', label: LONG_LABEL }];
export const GRID_LONG: DotItem[] = [{ id: 'gx', row: 'x', col: 'b', filled: true, label: LONG_LABEL, tone: 'global' }];
export const GRID_MANY: DotItem[] = Array.from({ length: 48 }, (_, i) => {
  const row = GRID_ROWS[i % 5];
  return { id: `gd-${i}`, row: row.id, col: GRID_COLS[Math.floor(i / 5) % 5].id, filled: i % 3 !== 0, label: `예시 기록 ${i + 1}`, tone: row.id as DiagramTone };
});

export const FUNNEL: FunnelStep[] = [
  { id: 'pool', label: '전체', count: 48 }, { id: 'open', label: '마감 전', count: 31 }, { id: 'eligible', label: '대상 맞음', count: 18 },
  { id: 'fit', label: '시간 맞음', count: 9 }, { id: 'fresh', label: '추천', count: 3 }
];
export const FUNNEL_LONG: FunnelStep[] = [{ id: 'l1', label: LONG_LABEL, count: 1200 }, { id: 'l2', label: LONG_LABEL, count: 1 }];
export const FUNNEL_MANY: FunnelStep[] = Array.from({ length: 9 }, (_, i) => ({ id: `f-${i}`, label: `단계 ${i + 1}`, count: Math.round(120 / (i + 1)) }));

export const SEGMENTS: Segment[] = [
  { id: 'dev', label: '개발', value: 4, tone: 'dev' }, { id: 'ai', label: 'AI·데이터', value: 3, tone: 'ai' }, { id: 'plan', label: '창업·기획', value: 2, tone: 'plan' },
  { id: 'mentor', label: '멘토링', value: 1, tone: 'mentor' }, { id: 'global', label: '글로벌', value: 1, tone: 'global' }
];
export const SEGMENTS_LONG: Segment[] = [
  { id: 'a', label: LONG_LABEL, value: 97, tone: 'plan' }, { id: 'b', label: '아주 작은 조각', value: 1, tone: 'mentor' }, { id: 'c', label: '또 작은 조각', value: 1, tone: 'ai' }
];
export const SEGMENTS_MANY: Segment[] = Array.from({ length: 14 }, (_, i) => ({ id: `s-${i}`, label: `분야 ${i + 1}`, value: 1 + (i % 4), tone: TONES[i % 5] }));

export const LOOP: [LoopNode, LoopNode, LoopNode] = [
  { id: 'records', label: '기록', value: '6개' }, { id: 'analysis', label: '분석', value: '확인할 발견 2개' }, { id: 'recommend', label: '추천', value: '3개' }
];
export const LOOP_LONG: [LoopNode, LoopNode, LoopNode] = [
  { id: 'a', label: LONG_LABEL, value: LONG_LABEL }, { id: 'b', label: '분석' }, { id: 'c', label: LONG_LABEL, value: '3개' }
];
