import { buildFlow, flowStory, type FlowStep } from '../analysis/flow';
import { buildGraph, clusterInsight, type Cluster, type KnowledgeGraph } from '../analysis/graph';
import type { EdgeAnswers } from '../analysis/map';
import { axesOfProgram, buildStrengths, DID_DOING, leadStrengths, type Strength } from '../analysis/strengths';
import { buildTechTree, TREE_COLUMNS, type TechTree, type TreeRow } from '../analysis/techtree';
import { ddayOf } from '../recommend';
import { firstReason } from '../onboarding';
import { josa } from '../text';
import { goalGroups } from '../recommend-flow/trace';
import type { Activity, Axis, FieldGroup, Profile, Program, RecordItem, Scored } from '../types';
import { AXES, DID_AXES, FIELD_GROUP, GROUP_LABEL } from '../vocab';
import { FILL_LINE, fitsNeed, pickGap, type Gap, type GapNeed } from './gap';
import { AXIS_DOING, CLUSTER_DOING, eul, eun, GROUP_DOING, identityLine, iga, ro, wa } from './phrases';

// 하나의 이야기: 네 분석(나의 강점·경험 지도·관심 흐름·테크 트리)과 추천을 한 줄로 엮는다.
// Rolfe 반성 모델의 What(정체성·근거) → So what(빈 곳) → Now what(다음 한 걸음) 순서다.
// 계산은 기존 분석 함수를 그대로 쓰고, 여기서는 고르기와 문장 조합만 한다. 점수·비교는 내지 않는다.
// 정체성 문장은 시스템의 가설이다. 학생이 '맞아요'로 고르기 전까지 status 는 'estimate'(옅은 점선)다.

export type StoryRoute = 'analysis/strengths' | 'analysis/map' | 'analysis/flow' | 'analysis/techtree';
export type ProofPic =
  | { kind: 'strength'; confirmed: number; total: number }
  | { kind: 'cluster'; groups: FieldGroup[] }
  | { kind: 'flow'; steps: { year: string; group: FieldGroup }[] }
  | { kind: 'depth'; group: FieldGroup; stages: ('done' | 'skipped' | 'none')[] };
/** 근거 한 칸: 해석 한 줄(line) + 숫자 하나(value). 누르면 그 분석 화면 */
export type Proof = { kind: 'strength' | 'cluster' | 'flow' | 'depth'; title: string; line: string; value: string; route: StoryRoute; pic: ProofPic };
export type Identity = { text: string; alternatives: string[]; basis: string; status: 'estimate' | 'confirmed' };
export type { Gap, GapNeed } from './gap';
/** same: 지금 가장 추천과 같은 후보인지. 다르면 note 가 이유를 말한다 */
/** guide: why 가 기록을 읽은 추정이 아니라 학생이 가입 때 고른 답에서 나온 문장이다(추정 표시를 붙이지 않는다) */
export type NextPick = { programId: string; title: string; why: string; same: boolean; note?: string; guide?: boolean };
export type ScreenLine = { soWhat: string; nowWhat?: string };
export type StoryScreen = 'techtree' | 'map' | 'flow' | 'strengths' | 'recommend' | 'records';
export type Story = {
  newStudent: boolean;
  identity: Identity;
  proofs: Proof[];
  gap?: Gap;
  next?: NextPick;
  perScreen: Record<StoryScreen, ScreenLine>;
  /** 추천 한 줄을 만들 때 쓰는 이야기의 축: 강점 순서, 빈 곳을 채우는 기회의 조건과 그 이유 */
  refs: { axes: Axis[]; gapNeed?: GapNeed; gapWhy?: string; goalWords: string };
};

export type StoryInput = {
  /** 분석에 쓴 기록(지금 근거 답을 덧입힌 것) */
  records: RecordItem[];
  profile: Profile;
  activities: Activity[];
  edgeAnswers: EdgeAnswers;
  /** 추천 순서로 정렬한 지금 후보 */
  scored: Scored[];
  week: number;
  programs: Program[];
  semesters: string[];
  /** 학생이 고른 정체성 문장. 이번 후보 문장 중 하나일 때만 확인으로 본다 */
  answer?: string | null;
};

const ROUTE: Record<Proof['kind'], StoryRoute> = { strength: 'analysis/strengths', cluster: 'analysis/map', flow: 'analysis/flow', depth: 'analysis/techtree' };
const year = (s: FlowStep) => s.years.replace(/년$/, '').split('~').at(-1)!;
const ownCount = (r: TreeRow) => [...r.cells, ...r.folds.flatMap(f => f.cells)].filter(c => c.kind === 'done' || c.kind === 'ongoing').length;

/** 목표 글과 관심 분야가 가리키는 분야 묶음 */
const goalOf = (p: Profile): FieldGroup[] => [...new Set([...goalGroups(p.goal), ...p.interests.filter((i): i is FieldGroup => i !== 'unknown')])];

/**
 * 지금 모이는 분야(관심 흐름의 끝)에 기록이 가장 많은 묶음. 같으면 사전 이름이 붙은 묶음(이름이 왜 붙었는지 설명할 수 있다), 그래도 같으면 큰 묶음(clusters 순서).
 * 묶음은 지식 그래프 분석(kg/analyze)의 Leiden 묶음이다.
 */
function pickCluster(g: KnowledgeGraph, end: FieldGroup | undefined, records: RecordItem[]): Cluster | undefined {
  const groupOf = new Map(records.map(r => [r.id, FIELD_GROUP[r.field]]));
  const inEnd = (c: Cluster) => c.recordIds.filter(id => groupOf.get(id) === end).length;
  const named = (c: Cluster) => Number(c.source === 'taxonomy');
  return g.clusters.reduce<Cluster | undefined>((a, b) => (!a || inEnd(b) > inEnd(a) || (inEnd(b) === inEnd(a) && named(b) > named(a)) ? b : a), undefined);
}

/** 묶음이 하는 일: 사전 주제가 있으면 그 주제의 말, AI 제안 이름 묶음이면 그 묶음에 가장 많은 분야의 말 */
export function clusterDoing(c: Cluster | undefined, records: RecordItem[], fallback: FieldGroup = 'other'): string {
  if (!c) return GROUP_DOING[fallback];
  if (c.topic && CLUSTER_DOING[c.topic]) return CLUSTER_DOING[c.topic];
  const count = new Map<FieldGroup, number>();
  for (const r of records) if (c.recordIds.includes(r.id)) count.set(FIELD_GROUP[r.field], (count.get(FIELD_GROUP[r.field]) ?? 0) + 1);
  const top = [...count].sort((x, y) => y[1] - x[1])[0]?.[0];
  return GROUP_DOING[top ?? fallback];
}

/** 가장 깊이 간 분야. 같은 단계면 지금 모이는 분야, 그다음 활동이 많은 분야 */
function pickDepth(tree: TechTree, end: FieldGroup | undefined): TreeRow | undefined {
  return tree.rows
    .filter(r => r.group !== 'other' && r.top >= 0)
    .sort((a, b) => b.top - a.top || Number(b.group === end) - Number(a.group === end) || ownCount(b) - ownCount(a))[0];
}

function stagesOf(row: TreeRow): ('done' | 'skipped' | 'none')[] {
  const all = [...row.cells, ...row.folds.flatMap(f => f.cells)];
  return TREE_COLUMNS.map((_, col) => {
    const here = all.filter(c => c.col === col);
    return here.some(c => c.kind === 'done' || c.kind === 'ongoing') ? 'done' : here.some(c => c.kind === 'skipped') ? 'skipped' : 'none';
  });
}

const unconfirmed = (s: Strength) => s.evidence.length - s.confirmed;

/** 이 기회에서 그 역량을 쓰는 일 */
const doingFor = (p: Program, axis: Axis) => p.did.find(d => DID_AXES[d].includes(axis));

/**
 * 다음 한 걸음. 빈 곳을 채우는 후보(조건이 다 맞는 것만. 조건을 풀면 '채운다'는 말이 거짓이 된다) 중 추천 순서가 가장 앞인 것('빈 곳을 채우는'),
 * 아니면 가장 확실한 강점을 쓰는 후보 중 가장 앞인 것('강점을 한 단계 깊게'). 둘 다 없으면 가장 추천.
 */
function pickNext(scored: Scored[], lead: Strength | undefined, gap: Gap | undefined, records: RecordItem[]): NextPick | undefined {
  const primary = scored[0]?.p;
  if (!primary) return undefined;
  const pack = (p: Program, why: string): NextPick => ({
    programId: p.id, title: p.title, why, same: p.id === primary.id,
    note: p.id === primary.id ? undefined : `가장 추천은 ‘${primary.title}’${josa(primary.title, '이에요', '예요')}. 이야기의 빈 곳에 더 가까워 이쪽을 골랐어요`
  });
  if (gap?.need && gap.why) {
    const need = gap.need;
    const fill = scored.find(s => fitsNeed(s.p, need))?.p;
    if (fill) return pack(fill, gap.why);
  }
  if (lead) {
    const deep = scored.find(s => doingFor(s.p, lead.axis))?.p;
    if (deep) return pack(deep, `${DID_DOING[doingFor(deep, lead.axis)!]} ${eul(lead.label)} 한 번 더 써요`);
  }
  // 기록이 없으면 가입 끝 장면과 같은 이유. 학생이 고른 답에서 나온 말이라 추정 표시를 붙이지 않는다
  if (!records.length) return { ...pack(primary, firstReason(scored[0].reasons)), guide: true };
  return pack(primary, '지금 후보 중 내 기록과 가장 잘 이어져요');
}

/** 기록이 없는 학생: 가입할 때 고른 관심·목표에서 '시작점' 문장 */
function startLine(profile: Profile): string {
  const groups = profile.interests.filter((i): i is FieldGroup => i !== 'unknown').map(g => GROUP_LABEL[g]);
  const where = groups.length > 1 ? `${wa(groups[0])} ${groups[1]}에서` : groups.length ? `${groups[0]}에서` : '';
  const goal = profile.goal.trim();
  if (goal && where) return `${eul(goal)} 향해 ${where} 첫걸음을 떼요`;
  if (goal) return `${eul(goal)} 향해 넓게 둘러보며 시작해요`;
  if (where) return `${where} 첫걸음을 떼요`;
  return '넓게 둘러보며 나에게 맞는 쪽을 찾기 시작해요';
}

function newStudentStory(input: StoryInput): Story {
  const next = pickNext(input.scored, undefined, undefined, []);
  const first = next ? `‘${next.title}’부터 해 보면 첫 기록이 생겨요` : '관심 분야나 시간을 바꾸면 후보가 생겨요';
  const blank: ScreenLine = { soWhat: '첫 기록이 생기면 이야기가 시작돼요', nowWhat: first };
  return {
    newStudent: true,
    identity: { text: startLine(input.profile), alternatives: [], basis: '가입할 때 고른 관심·목표를 읽고', status: 'estimate' },
    proofs: [],
    next,
    // 분석 화면 머리는 화면마다 '여기에 무엇이 생기는지' 한 줄. 같은 말을 다섯 번 듣지 않게 한다
    perScreen: {
      techtree: { soWhat: '점선 활동 하나가 첫 가지가 돼요', nowWhat: first },
      map: { soWhat: '회고를 쓰면 활동이 점으로 놓여요', nowWhat: first },
      flow: { soWhat: '학기마다 어떤 분야를 했는지 이어져요', nowWhat: first },
      strengths: { soWhat: '회고에서 드러난 강점이 여기 모여요', nowWhat: first },
      records: blank, recommend: { soWhat: '관심·목표에 맞춘 첫 활동이에요', nowWhat: first } },
    refs: { axes: [], goalWords: input.profile.goal.trim() }
  };
}

export function buildStory(input: StoryInput): Story {
  if (input.records.length === 0) return newStudentStory(input);
  const { records } = input;
  const strengths = buildStrengths(records);
  const lead = leadStrengths(strengths);
  const top = lead.rows[0] ?? strengths[0];
  const second = strengths.find(s => s !== top && s.evidence.length > 0);
  const graph = buildGraph(records, input.edgeAnswers);
  const steps = flowStory(buildFlow(records, input.semesters));
  const end = steps.at(-1)?.group;
  const cluster = pickCluster(graph, end, records);
  const tree = buildTechTree({
    records, activities: input.activities, programs: input.programs,
    candidates: input.scored.map(s => ({ program: s.p, dday: ddayOf(s.p, input.week) }))
  });
  const depth = pickDepth(tree, end);
  const found = pickGap({ tree, strengths, records, goal: goalOf(input.profile), programs: input.programs, now: input.semesters.at(-1) ?? '' });
  const next = pickNext(input.scored, top?.evidence.length ? top : undefined, found, records);
  // 다음 한 걸음이 이 빈 곳을 채우면(이유가 빈 곳의 이유) 빈 곳 문장 뒤에 그렇다고 이어 말한다.
  const filled = !!found?.why && next?.why === found.why;
  const gap = found && { ...found, filled, line: filled ? found.line + FILL_LINE : found.line };

  // 정체성: 그 묶음이 하는 일 + 가장 확실한 강점이 하는 일. 대안은 강점이나 묶음 하나만 바꾼 짝이라 학생이 '어느 쪽이 더 나인가'만 고르면 된다.
  const doingOf = (c?: Cluster) => clusterDoing(c, records, end ?? 'other');
  const otherCluster = graph.clusters.find(c => c !== cluster && doingOf(c) !== doingOf(cluster));
  const third = strengths.find(s => s !== top && s !== second && s.evidence.length > 0);
  const options = [
    top && identityLine(doingOf(cluster), AXIS_DOING[top.axis]),
    second && identityLine(doingOf(cluster), AXIS_DOING[second.axis]),
    top && otherCluster && identityLine(doingOf(otherCluster), AXIS_DOING[top.axis]),
    third && identityLine(doingOf(cluster), AXIS_DOING[third.axis])
  ].filter((t, i, all): t is string => !!t && all.indexOf(t) === i).slice(0, 4);
  const picked = input.answer && options.includes(input.answer) ? input.answer : undefined;
  const text = picked ?? options[0] ?? '기록이 더 쌓이면 이야기가 또렷해져요';
  const confirmedTotal = strengths.reduce((n, s) => n + s.confirmed, 0);
  const identity: Identity = {
    text, alternatives: options.filter(o => o !== text).slice(0, 3),
    basis: `기록 ${records.length}개·확인 근거 ${confirmedTotal}개를 읽고`, status: picked ? 'confirmed' : 'estimate'
  };

  const proofs: Proof[] = [];
  if (top?.evidence.length) {
    proofs.push({
      kind: 'strength', title: '나의 강점', route: ROUTE.strength, pic: { kind: 'strength', confirmed: top.confirmed, total: top.evidence.length },
      line: lead.confirmed ? `${iga(top.label)} 가장 확실해요` : `${iga(top.label)} 보이는 것 같아요`,
      value: lead.confirmed ? `확인 근거 ${top.confirmed}개` : `확인 전 근거 ${top.evidence.length}개`
    });
  }
  if (cluster) {
    const groupOf = new Map(records.map(r => [r.id, FIELD_GROUP[r.field]]));
    proofs.push({
      kind: 'cluster', title: '경험 지도', route: ROUTE.cluster, pic: { kind: 'cluster', groups: cluster.recordIds.map(id => groupOf.get(id) ?? 'other') },
      line: `${cluster.name} 활동이 같은 쪽을 가리켜요`, value: `활동 ${cluster.recordIds.length}개`
    });
  }
  if (steps.length) {
    const first = steps[0];
    const last = steps[steps.length - 1];
    proofs.push({
      kind: 'flow', title: '관심 흐름', route: ROUTE.flow, pic: { kind: 'flow', steps: steps.map(s => ({ year: year(s), group: s.group })) },
      line: steps.length > 1 ? `${GROUP_LABEL[first.group]}에서 ${ro(GROUP_LABEL[last.group])} 모였어요` : `${ro(GROUP_LABEL[first.group])} 시작했어요`,
      value: steps.length > 1 ? `${Number(year(last)) - Number(year(first)) + 1}년 동안` : first.years
    });
  }
  if (depth) {
    proofs.push({
      kind: 'depth', title: '테크 트리', route: ROUTE.depth, pic: { kind: 'depth', group: depth.group, stages: stagesOf(depth) },
      line: `${eun(depth.label)} ${TREE_COLUMNS[depth.top]}까지 갔어요`, value: `활동 ${ownCount(depth)}개`
    });
  }

  // 화면마다 해석 한 줄(soWhat)과 행동 한 줄(nowWhat). soWhat 은 머리에 혼자 서므로 가운뎃점으로 둘을 잇지 않는다. 이야기와 같은 낱말을 써서 화면을 옮겨도 같은 말을 듣게 한다.
  const insight = cluster ? clusterInsight(graph, cluster.id, input.scored.map(s => s.p)) : null;
  const clusterAxis = insight?.axes[0];
  const clusterEst = insight?.axes.reduce((n, a) => n + a.estimated, 0) ?? 0;
  const estAxis = strengths.filter(s => unconfirmed(s) > 0).sort((a, b) => unconfirmed(b) - unconfirmed(a))[0];
  const perScreen: Record<StoryScreen, ScreenLine> = {
    techtree: {
      soWhat: depth ? `${eun(depth.label)} ${TREE_COLUMNS[depth.top]}까지 갔어요` : '첫 활동이 가지의 시작점이 돼요',
      nowWhat: tree.candidates.length ? `회색 점선 ${tree.candidates.length}개는 지금 신청할 수 있어요` : undefined
    },
    map: {
      soWhat: cluster && clusterAxis ? `${cluster.name} 활동 ${cluster.recordIds.length}개가 ${clusterAxis.label}의 근거가 됐어요` : '활동이 쌓이면 묶음이 생겨요',
      nowWhat: clusterEst ? `추정 근거 ${clusterEst}개를 확인하면 지도가 단단해져요` : undefined
    },
    flow: {
      soWhat: proofs.find(p => p.kind === 'flow')?.line ?? '학기마다 한 분야가 이어져요',
      nowWhat: next && end && input.scored.find(s => s.p.id === next.programId && FIELD_GROUP[s.p.field] === end) ? `‘${next.title}’${josaOf(next.title)} 이 흐름을 이어 가요` : undefined
    },
    strengths: {
      soWhat: top ? `${iga(top.label)} 가장 확실하고${second ? `, ${iga(second.label)} 뒤따라요` : '요'}` : '회고를 쓰면 강점이 보여요',
      nowWhat: estAxis ? `확인 전 ${estAxis.label} 근거 ${unconfirmed(estAxis)}개를 맞는지 봐 주세요` : undefined
    },
    recommend: { soWhat: next?.why ?? '', nowWhat: next ? '신청 준비는 내가 직접 눌러요' : undefined },
    records: { soWhat: `기록 ${records.length}개가 이야기의 재료예요`, nowWhat: '회고를 하나 더 쓰면 이야기가 또렷해져요' }
  };

  const story: Story = { newStudent: false, identity, proofs: proofs.slice(0, 4), gap, next, perScreen, refs: { axes: strengths.filter(s => s.evidence.length).map(s => s.axis), gapNeed: gap?.need, gapWhy: gap?.why, goalWords: input.profile.goal.trim() } };
  story.perScreen.recommend.soWhat = next ? storyLineFor(story, next.programId, input.scored.map(s => s.p)) : '';
  return story;
}

/** '…로' 조사: 제목 끝 글자 기준 */
const josaOf = (title: string) => ro(title).slice(title.length);

/**
 * 이 활동이 이야기에서 뜻하는 것 한 줄(추천 자세히 '왜 추천했나' 맨 위에 쓸 문장). programs 에서 id 로 찾고, 없으면 빈 문자열.
 * 빈 곳 분야면 '채워요', 가장 확실한 강점을 쓰면 '한 단계 깊게', 둘째 강점이면 '함께 키워요', 아니면 '넓혀 봐요'.
 */
export function storyLineFor(story: Story, programId: string, programs: Program[]): string {
  const p = programs.find(x => x.id === programId);
  if (!p) return '';
  const group = FIELD_GROUP[p.field];
  if (story.newStudent) return story.refs.goalWords ? `${story.refs.goalWords} 쪽으로 가는 첫 활동이에요` : '넓게 둘러보는 첫 활동이에요';
  const { gapNeed, gapWhy } = story.refs;
  if (gapNeed && gapWhy && fitsNeed(p, gapNeed)) return gapWhy;
  const uses = axesOfProgram(p);
  const label = (a: Axis) => AXES.find(x => x.id === a)!.label;
  const [a1, a2] = story.refs.axes;
  if (a1 && uses.includes(a1)) return `가장 확실한 ${eul(label(a1))} 한 단계 깊게 써 봐요`;
  if (a2 && uses.includes(a2)) return `뒤따르는 강점 ${eul(label(a2))} 함께 키워요`;
  return `이야기 밖의 ${eul(GROUP_LABEL[group])} 넓혀 봐요`;
}
