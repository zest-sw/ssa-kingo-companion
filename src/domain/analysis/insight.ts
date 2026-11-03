import type { RecordItem } from '../types';
import { DID_LABEL, GROUP_LABEL } from '../vocab';
import { josa } from '../text';
import type { FlowRow } from './flow';
import { edgeState, type ExperienceMap, type EdgeAnswers } from './map';
import { semesterLabel } from './semester';
import { levelLabel, type StrengthRow } from './strengths';
import type { TechTree } from './techtree';

// 나의 분석 요약 카드의 한 줄 통찰. 학생의 기록에서 계산하고, 기록이 없으면 다음에 할 일 한 줄을 돌려준다.

export type Insight = { sentence: string; value?: string };

const NO_RECORD = '회고를 쓰면 여기에 채워져요';
const names = (list: string[], max = 2) => (list.length > max ? `${list.slice(0, max).join('·')} 외 ${list.length - max}곳` : list.join('·'));

/** 테크 트리: 가장 많이 해 본 분야와 아직 안 해 본 분야 */
export function treeInsight(tree: TechTree): Insight {
  const done = tree.rows.filter(r => r.group !== 'other').map(r => ({ r, n: r.cells.filter(c => c.kind !== 'candidate').length })).filter(x => x.n > 0);
  if (done.length === 0) return { sentence: '활동을 끝내고 회고를 쓰면 해 본 분야가 채워져요' };
  const top = done.reduce((a, b) => (b.n > a.n ? b : a));
  const blank = tree.rows.filter(r => r.unknown && r.group !== 'other').map(r => r.label);
  return {
    sentence: blank.length ? `가장 많이 해 본 분야는 ${top.r.label}, 아직 안 해 본 분야는 ${names(blank)}이에요` : `가장 많이 해 본 분야는 ${top.r.label}이에요`,
    value: `해 본 칸 ${done.reduce((n, x) => n + x.n, 0)}개`
  };
}

/** 경험 지도: 가장 자주 한 일이 기록 몇 개에 이어지는지. 같은 일이 둘 이상이어야 '이어진다'고 말한다. */
export function mapInsight(map: ExperienceMap, answers: EdgeAnswers): Insight {
  if (map.nodes.length === 0) return { sentence: '회고를 쓰면 기록이 점으로 이어져요' };
  const count = new Map<string, number>();
  for (const n of map.nodes) count.set(n.record.did, (count.get(n.record.did) ?? 0) + 1);
  const [did, n] = [...count].sort((a, b) => b[1] - a[1])[0];
  const yes = map.edges.filter(e => edgeState(e, answers) === 'confirmed').length;
  const value = `기록 ${map.nodes.length}개 · 확인한 연결 ${yes}개`;
  if (n < 2) return { sentence: '같은 일을 한 기록이 하나 더 생기면 선이 이어져요', value };
  const label = DID_LABEL[did as RecordItem['did']];
  return { sentence: `‘${label}’${josa(label, '이', '가')} 기록 ${n}개에 이어져요`, value };
}

/** 관심 흐름: 학기마다 가장 많은 분야와, 그 분야가 몇 학기째 계속인지. rows 는 기록이 있는 학기만 오래된 순서로. */
export function flowInsight(rows: FlowRow[]): Insight {
  const seen = rows.filter(r => r.total > 0);
  if (seen.length === 0) return { sentence: '학기마다 회고를 쓰면 관심이 어디로 흐르는지 보여요' };
  const topOf = (r: FlowRow) => [...r.segments].sort((a, b) => b.count - a.count)[0].group;
  const last = seen[seen.length - 1];
  const group = topOf(last);
  let from = seen.length - 1;
  while (from > 0 && topOf(seen[from - 1]) === group) from--;
  const label = GROUP_LABEL[group];
  const value = `기록이 있는 학기 ${seen.length}개`;
  if (from < seen.length - 1) return { sentence: `${semesterLabel(seen[from].semester)}부터 ${label}${josa(label, '이', '가')} 계속 가장 많아요`, value };
  return { sentence: `${semesterLabel(last.semester)}에는 ${label}${josa(label, '이', '가')} 가장 많아요`, value };
}

/** 나의 강점: 기록과 내 생각이 가장 크게 다른 역량 하나. 다른 게 없으면 기록에서 가장 많이 보인 역량. */
export function strengthInsight(rows: StrengthRow[]): Insight {
  const seenRows = rows.filter(r => r.count > 0);
  if (seenRows.length === 0) return { sentence: '회고를 쓰면 기록에서 보인 역량이 나와요' };
  const value = `기록에서 보인 역량 ${seenRows.length}개`;
  const rank = { none: 0, low: 1, mid: 2, high: 3 };
  const gap = (r: StrengthRow) => Math.abs(rank[r.seen] - rank[r.self]);
  // 기록에 더 많이 보이는 역량을 먼저 말한다. 기록이 아예 없는 역량을 '내 생각과 다르다'고 말하면 쓸 데가 없다.
  const diff = rows.filter(r => r.gap === 'seen-more' || (r.gap === 'self-more' && r.seen !== 'none')).sort((a, b) => Number(b.gap === 'seen-more') - Number(a.gap === 'seen-more') || gap(b) - gap(a))[0];
  if (diff) {
    const seenText = diff.seen === 'none' ? '없고' : `‘${levelLabel(diff.seen)}’이고`;
    return { sentence: `${diff.label}${josa(diff.label, '은', '는')} 기록에서 ${seenText} 내 생각은 ‘${levelLabel(diff.self)}’이에요`, value };
  }
  const top = [...seenRows].sort((a, b) => b.count - a.count)[0];
  return { sentence: `기록에서 가장 많이 보인 역량은 ${top.label}이에요`, value };
}
