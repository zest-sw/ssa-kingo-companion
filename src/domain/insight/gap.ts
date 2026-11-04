import { levelOf, type Level } from '../analysis/level';
import { semesterKey } from '../analysis/semester';
import type { Strength } from '../analysis/strengths';
import { TREE_COLUMNS, type TechTree, type TreeRow } from '../analysis/techtree';
import type { Did, FieldGroup, Program, RecordItem } from '../types';
import { FIELD_GROUP, GROUP_LABEL } from '../vocab';
import { eul, eun } from './phrases';

// 이야기에서 비어 있는 한 곳. '경험의 빈 곳'을 먼저 말하고, 확인 전 근거(사무 안내에 가깝다)는 맨 마지막에 둔다.
// 문장은 경고가 아니라 기회처럼: '아직 ~해 본 적은 없어요'. 다음 한 걸음이 채우면 story.ts 가 뒤에 FILL_LINE 을 붙인다.

export type GapRoute = 'analysis/strengths' | 'analysis/map' | 'analysis/techtree';
/** 이 빈 곳을 채우는 기회의 조건. 모두 맞아야 한다(없는 조건은 따지지 않는다) */
export type GapNeed = { group?: FieldGroup; dids?: Did[]; level?: Level; minLevel?: Level };
export type Gap = {
  kind: 'skipped' | 'untried' | 'type' | 'once' | 'estimate';
  line: string;
  route: GapRoute;
  group?: FieldGroup;
  need?: GapNeed;
  /** 다음 한 걸음이 이 빈 곳을 채울 때 쓰는 이유 */
  why?: string;
  /** 다음 한 걸음이 이 빈 곳을 채우는지 */
  filled?: boolean;
};

export const FILL_LINE = ' · 다음 한 걸음이 여기를 채워요';

export const fitsNeed = (p: Program, n: GapNeed) =>
  (!n.group || FIELD_GROUP[p.field] === n.group) && (!n.dids || p.did.some(d => n.dids!.includes(d))) && (!n.level || p.level === n.level) && (!n.minLevel || p.level >= n.minLevel);

/**
 * 목표 분야에 필요한 활동 유형. 기록에 없으면 빈 곳이다.
 * ponytail: 직무와 상관없이 같은 세 유형을 쓰는 예시 규칙이다. 목표를 직무 요건 데이터로 받게 되면 직무별 표로 바꾼다.
 */
type Kind = { label: (goal: string) => string; why: string; has: (rs: RecordItem[], level: (r: RecordItem) => Level, goal: FieldGroup) => boolean; applies?: (rs: RecordItem[], goal: FieldGroup) => boolean; need: (goal: FieldGroup) => GapNeed };
const inGroup = (r: RecordItem, g: FieldGroup) => FIELD_GROUP[r.field] === g;
const KINDS: Kind[] = [
  {
    // 만든 것이 있을 때만 묻는다. 만든 뒤(같은 학기 포함) 같은 분야에서 사용자 이야기를 듣거나 물었으면 검증해 본 것으로 본다.
    label: () => '만든 것을 사용자에게 직접 검증해 본', why: '만든 것을 사용자에게 검증하는 빈 곳을 채워요',
    applies: (rs, g) => rs.some(r => inGroup(r, g) && r.did === 'make'),
    has: (rs, _l, g) => {
      const made = rs.filter(r => inGroup(r, g) && r.did === 'make').map(r => semesterKey(r.semester));
      return rs.some(r => inGroup(r, g) && (r.did === 'listen' || r.did === 'ask') && made.some(k => semesterKey(r.semester) >= k));
    },
    need: g => ({ group: g, dids: ['listen', 'ask'] })
  },
  // 목표 분야 안에서 이끈 경험만 센다(다른 분야에서 이끈 건 그 분야의 이야기다).
  { label: g => `${g} 쪽에서 팀을 이끌어 본`, why: '팀을 이끌어 보는 빈 곳을 채워요', has: (rs, l, g) => rs.some(r => inGroup(r, g) && r.did === 'organize' && l(r) === 3), need: g => ({ group: g, dids: ['organize'], minLevel: 2 }) },
  { label: () => '결과를 사람들 앞에서 발표해 본', why: '결과를 발표해 보는 빈 곳을 채워요', has: (rs, l) => rs.some(r => r.did === 'present' && l(r) >= 2), need: () => ({ dids: ['present'] }) }
];

const unconfirmed = (s: Strength) => s.evidence.length - s.confirmed;

/**
 * 순서: 목표 분야의 건너뛴 단계 → 목표 분야인데 안 해 본 것 → 목표에 필요한데 안 해 본 활동 유형
 * → 한 번뿐이라 이어지지 않은 분야(이번 학기 것은 아직 이어질 수 있어 뺀다) → 다른 분야의 건너뛴 단계 → 확인 전 근거가 많은 강점(맨 마지막).
 */
export function pickGap(input: { tree: TechTree; strengths: Strength[]; records: RecordItem[]; goal: FieldGroup[]; programs: Program[]; now: string }): Gap | undefined {
  const { tree, strengths, records, goal } = input;
  const byId = Object.fromEntries(input.programs.map(p => [p.id, p])) as Record<string, Program>;
  const level = (r: RecordItem) => levelOf(r, byId);
  const rows = tree.rows.filter(r => r.group !== 'other');
  const skipped = (r: TreeRow) => r.cells.find(c => c.kind === 'skipped');
  const skipGap = (r: TreeRow): Gap => {
    const col = skipped(r)!.col;
    const stage = TREE_COLUMNS[col];
    return { kind: 'skipped', line: `아직 ${r.label} ${stage} 활동은 해 본 적이 없어요`, route: 'analysis/techtree', group: r.group, need: { group: r.group, level: (col + 1) as Level }, why: `비어 있는 ${r.label} ${stage} 자리를 채워요` };
  };

  const goalSkip = rows.find(r => goal.includes(r.group) && skipped(r));
  if (goalSkip) return skipGap(goalSkip);
  const goalBlank = rows.find(r => goal.includes(r.group) && r.unknown);
  if (goalBlank) return { kind: 'untried', line: `아직 ${goalBlank.label} 활동은 해 본 적이 없어요`, route: 'analysis/techtree', group: goalBlank.group, need: { group: goalBlank.group }, why: `처음으로 ${eul(goalBlank.label)} 해 봐요` };

  const main = goal.find(g => rows.some(r => r.group === g));
  if (main) {
    const kind = KINDS.find(k => (k.applies?.(records, main) ?? true) && !k.has(records, level, main));
    if (kind) return { kind: 'type', line: `아직 ${kind.label(GROUP_LABEL[main])} 적은 없어요`, route: 'analysis/map', need: kind.need(main), why: kind.why };
  }

  const nowKey = semesterKey(input.now);
  const once = rows.find(r => {
    const own = records.filter(x => inGroup(x, r.group));
    return own.length === 1 && semesterKey(own[0].semester) < nowKey;
  });
  if (once) return { kind: 'once', line: `${eun(once.label)} 한 번 해 보고 아직 이어지지 않았어요`, route: 'analysis/techtree', group: once.group, need: { group: once.group }, why: `한 번에 그친 ${eul(once.label)} 다시 이어 가요` };

  const anySkip = rows.find(r => skipped(r));
  if (anySkip) return skipGap(anySkip);

  const est = strengths.filter(s => unconfirmed(s) >= 3).sort((a, b) => unconfirmed(b) - unconfirmed(a))[0];
  if (est) return { kind: 'estimate', line: `${est.label} 근거 ${unconfirmed(est)}개는 아직 내 확인을 기다려요`, route: 'analysis/strengths' };
  return undefined;
}
