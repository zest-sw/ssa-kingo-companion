import { LEVEL_NAME, levelOf } from './analysis/level';
import { leadStrengths, type Strength } from './analysis/strengths';
import { missingStar } from './interview/answer';
import { josa } from './text';
import type { Activity, FieldGroup, Program, RecordItem } from './types';
import { FIELD_GROUP, GROUP_LABEL } from './vocab';

// 홈 '상태창' 계산. 값은 모두 센 개수다(점수·레벨 아님). 화면은 이 값을 그리기만 한다.

/** 가진 것: 기록 · 경험 카드(STAR 네 칸을 다 채운 기록) · 학교 확인 · 달성한 도전 과제 · 가장 깊이 간 분야 */
export type Inventory = { records: number; cards: number; school: number; challenges: number; deepest?: string };

/** 지금 상황 한 줄: 하는 중 · 이번 주 마감 · 회고 대기 */
export type Situation = { doing: number; dueThisWeek: number; reviewWaiting: number };

/** 칭호 = 정체성 가설 한 줄. estimated 면 AI 추정(점선 밑줄)이다. 근거가 없으면 empty */
export type Title = { text: string; estimated: boolean; empty: boolean };

const starFilled = (r: RecordItem) => !!r.card && missingStar(r.card).length === 0;

/** 가장 깊이 간 분야: 기록의 심화 수준이 가장 높은 분야 묶음. 같으면 기록이 많은 쪽. '창업·기획 심화' */
export function deepestField(records: RecordItem[], programs?: Record<string, Program>): string | undefined {
  const by = new Map<FieldGroup, { level: number; n: number }>();
  for (const r of records) {
    const g = FIELD_GROUP[r.field];
    if (g === 'other') continue;
    const cur = by.get(g) ?? { level: 0, n: 0 };
    by.set(g, { level: Math.max(cur.level, levelOf(r, programs)), n: cur.n + 1 });
  }
  const best = [...by].sort((a, b) => b[1].level - a[1].level || b[1].n - a[1].n)[0];
  return best && `${GROUP_LABEL[best[0]]} ${LEVEL_NAME[best[1].level as 1 | 2 | 3]}`;
}

export function inventoryOf(records: RecordItem[], achieved: number, programs?: Record<string, Program>): Inventory {
  return {
    records: records.length,
    cards: records.filter(starFilled).length,
    school: records.filter(r => r.verification === 'school').length,
    challenges: achieved,
    deepest: deepestField(records, programs)
  };
}

/** 이번 주 = 오늘부터 6일 안에 마감이 있는, 아직 신청 전·신청한 활동 */
export function situationOf(activities: Activity[]): Situation {
  return {
    doing: activities.filter(a => a.status === 'ongoing').length,
    dueThisWeek: activities.filter(a => (a.status === 'preparing' || a.status === 'applied') && a.due && a.due.dday >= 0 && a.due.dday <= 6).length,
    reviewWaiting: activities.filter(a => a.status === 'ended').length
  };
}

/** 기록이 가장 많은 분야 묶음(기타 제외) */
function topGroup(records: RecordItem[]): FieldGroup | undefined {
  const n = new Map<FieldGroup, number>();
  for (const r of records) { const g = FIELD_GROUP[r.field]; if (g !== 'other') n.set(g, (n.get(g) ?? 0) + 1); }
  return [...n].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/**
 * 칭호 한 줄: '창업·기획 길에서 협업을 쌓는 사람'. 가장 많이 간 분야 + 근거가 가장 많은 강점.
 * ponytail: 이야기 모델(buildStory 의 정체성)이 들어오면 그 문장으로 바꾼다. v23-story 병합 때.
 */
export function titleOf(records: RecordItem[], strengths: Strength[]): Title {
  const lead = leadStrengths(strengths).rows[0];
  const g = topGroup(records);
  if (!lead || !g) return { text: '아직 이야기가 시작되지 않았어요', estimated: false, empty: true };
  return { text: `${GROUP_LABEL[g]} 길에서 ${lead.label}${josa(lead.label, '을', '를')} 쌓는 사람`, estimated: true, empty: false };
}

/** 퀘스트 게시판 문 카드 숫자: 새 퀘스트 수 · 가장 가까운 마감(D-n) */
export function nearestDday(ddays: number[]): number | undefined {
  const open = ddays.filter(d => d >= 0);
  return open.length ? Math.min(...open) : undefined;
}
