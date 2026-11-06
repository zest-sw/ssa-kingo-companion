import { josa } from '../text';
import type { Category, Program, RecordItem } from '../types';
import { CATEGORY_LABEL, categoryOf } from './opportunities';
import { keyGains } from './row';
import { traceLine, type TraceNode } from './trace';

// 추천 목록 전체의 이유 줄을 한 번에 고른다. 같은 기록·같은 문장을 두 행에 쓰면 이유가 아니라 장식으로 읽힌다(토스 07 Explain Why).

/** 이유가 어디서 왔나. 어떻게 골랐나 모달이 이 목록에 실제로 쓴 것만 보여 준다 */
export type LineSource = 'record' | 'focus' | 'career' | 'strength' | 'goal' | 'interest' | 'type' | 'field' | 'bridge' | 'time' | 'gain' | 'kind';
export type RowLine = { kind: 'why' | 'gain'; text: string; source: LineSource };
export type LineInput = { p: Program; nodes: TraceNode[] };
export type LineCtx = { newcomer: boolean; records: RecordItem[] };

export const SOURCE_LABEL: Record<LineSource, string> = {
  record: '내 기록', focus: '확인한 발견', career: '진로 공고', strength: '확인한 강점', goal: '가입 목표', interest: '고른 관심',
  type: '안 해 본 종류', field: '안 해 본 분야', bridge: '지난주 기록', time: '짧은 시간', gain: '얻는 것', kind: '활동 종류'
};
const SOURCE_ORDER = Object.keys(SOURCE_LABEL) as LineSource[];

const NODE_SOURCE: Partial<Record<TraceNode['kind'], LineSource>> = {
  energy: 'record', focus: 'focus', career: 'career', strength: 'strength', goal: 'goal', interest: 'interest', novelty: 'field', bridge: 'bridge'
};
/** 기록·진로·발견·강점처럼 그 학생에게서 나온 이유. 다른 이유보다 앞에 두고, 기회마다 낱말이 다른 것(기록 이름, 공고 요건)부터 */
const RECORD_SOURCES: LineSource[] = ['record', 'career', 'focus', 'strength'];

// ponytail: 기록의 종류는 자유 글이라 아는 낱말만 기회 종류로 읽는다. 기록이 기회 종류(Category)를 갖게 되면 그 값을 쓴다.
const RECORD_KIND_CATEGORY: Record<string, Category> = {
  특강: 'lecture', 해커톤: 'hackathon', 대회: 'contest', 공모전: 'contest', 캠프: 'edu', 워크숍: 'edu',
  동아리: 'club', 스터디: 'club', 학회: 'club', 봉사: 'volunteer', 멘토링: 'mentoring', 교환학생: 'global', 채용: 'job', 인턴: 'job'
};
export const triedCategories = (records: RecordItem[]): Set<Category> =>
  new Set(records.map(r => RECORD_KIND_CATEGORY[r.kind]).filter((c): c is Category => !!c));

/** 짧게 끝나는 기회만 시간이 이유가 된다(1시간 30분 이하, '1시간'·'1시간 30분' 꼴) */
const SHORT_HOURS = 1.5;
function timeLine(p: Program): string | undefined {
  if (p.hours > SHORT_HOURS || !/^\d+시간( \d+분)?$|^\d+분$/.test(p.durationLabel)) return undefined;
  const d = p.durationLabel;
  return `${p.format === 'online' ? '온라인 ' : ''}${d}${josa(d, '이면', '면')} 돼요`;
}

/** 어떤 종류의 활동인지 한 줄: '온라인 특강이에요' */
function kindLine(p: Program): string {
  const l = CATEGORY_LABEL[categoryOf(p)];
  return `${p.format === 'online' ? '온라인 ' : ''}${l}${josa(l, '이에요', '예요')}`;
}

/**
 * frame: 낱말 하나만 바꿔 여러 기회에 붙는 틀. 한 목록에 한 번만 쓴다.
 * 새 학생의 '넓게 둘러보려고 섞은 ○○ 분야예요'는 분야만 다를 뿐 모든 탐색 기회에 같은 이유라, 두 번째부터는 이유가 아니라 장식이다.
 */
type Cand = RowLine & { recordId?: string; frame?: string };
const why = (source: LineSource, text: string, recordId?: string, frame?: string): Cand => ({ kind: 'why', source, text, recordId, frame });
const frameOf = (n: TraceNode): string | undefined => (n.kind === 'novelty' && n.detail.startsWith('처음 해 보는 ') ? 'newcomer-novelty' : undefined);

/**
 * 한 기회의 이유 후보, 강한 것부터: 기록에 이어진 것 → 목표 → 관심 → 안 해 본 종류 → 안 해 본 분야 → 짧은 시간 → 얻는 것(구체적인 것부터)
 * → (새 학생) 활동 종류. 새 학생에게 '안 해 본 종류'는 정보가 없어서, 맨 끝에 어떤 종류의 활동인지만 말한다.
 */
function candidates({ p, nodes }: LineInput, ctx: LineCtx, tried: Set<Category>): Cand[] {
  const from = (s: LineSource) => nodes.filter(n => NODE_SOURCE[n.kind] === s).map(n => why(s, traceLine(n), n.recordId, frameOf(n)));
  const out: Cand[] = RECORD_SOURCES.flatMap(from);
  out.push(...from('goal'), ...from('interest'));
  // 새 학생은 모든 종류가 처음이라 '안 해 본 종류'가 정보가 없다.
  const cat = categoryOf(p);
  if (!ctx.newcomer && !tried.has(cat)) { const l = CATEGORY_LABEL[cat]; out.push(why('type', `아직 안 해 본 ${l}${josa(l, '이에요', '예요')}`)); }
  // 관심으로 고른 기회에 '넓게 둘러보려고 섞었다'를 붙이면 틀린 이유다.
  if (!(ctx.newcomer && nodes.some(n => n.kind === 'interest'))) out.push(...from('field'));
  out.push(...from('bridge'));
  const t = timeLine(p);
  if (t) out.push(why('time', t));
  out.push(...keyGains(p, 3).map(g => ({ kind: 'gain' as const, source: 'gain' as const, text: g.label })));
  // 종류는 기회에 대한 사실이라 '왜'가 아니다. 가장 추천 카드는 쓰지 않는다
  if (ctx.newcomer) out.push({ kind: 'gain', source: 'kind', text: kindLine(p) });
  return out;
}

/**
 * 가장 추천의 이유는 가장 강한 것 그대로 둔다(기록·목표·관심 같은 '왜'만. 얻는 것은 카드에 따로 있다).
 * 목록 행은 위에서부터, 이미 쓴 문장·이미 쓴 기록·이미 쓴 틀을 건너뛰고 그 기회의 다음 이유를 쓴다. 다 썼으면 비운다.
 */
export function pickLines(top: LineInput | undefined, rows: LineInput[], ctx: LineCtx): { top?: RowLine; rows: (RowLine | undefined)[] } {
  const tried = triedCategories(ctx.records);
  const usedText = new Set<string>();
  const usedRecord = new Set<string>();
  const usedFrame = new Set<string>();
  const take = (c: Cand | undefined): RowLine | undefined => {
    if (!c) return undefined;
    usedText.add(c.text);
    if (c.recordId) usedRecord.add(c.recordId);
    if (c.frame) usedFrame.add(c.frame);
    return { kind: c.kind, text: c.text, source: c.source };
  };
  const topLine = top ? take(candidates(top, ctx, tried).find(c => c.kind === 'why')) : undefined;
  const lines = rows.map(r => take(candidates(r, ctx, tried).find(c => !usedText.has(c.text) && !(c.recordId && usedRecord.has(c.recordId)) && !(c.frame && usedFrame.has(c.frame)))));
  return { top: topLine, rows: lines };
}

/** 이 목록에 실제로 쓴 이유 종류의 이름, 정해진 순서로 */
export function usedSources(lines: { top?: RowLine; rows: (RowLine | undefined)[] }): string[] {
  const used = new Set([lines.top, ...lines.rows].filter((l): l is RowLine => !!l).map(l => l.source));
  return SOURCE_ORDER.filter(s => used.has(s)).map(s => SOURCE_LABEL[s]);
}
