import { josa } from './text';
import type { Catalog, Category, Did, Direction, Field, FieldGroup, Funnel, Interest, LastDone, Mode, Profile, Program, Reason, ReasonKind, RecordItem, Scored } from './types';
import { DID_LABEL, FIELD_GROUP, fieldName, GROUP_LABEL, inInterests } from './vocab';

// 추천 규칙. v0.7 rank 를 그대로 옮겼다. 점수는 정렬에만 쓰고 화면에 내지 않는다.

export const ddayOf = (p: Program, week: number) => p.ddayW1 - 7 * (week - 1);
/** 관심 이름과 화면의 분류 이름이 같은 것. '멘토링'을 고른 학생에게 '멘토링' 분류 기회는 분야 묶음이 달라도 고른 관심이다. */
const INTEREST_CATEGORY: Partial<Record<FieldGroup, Category[]>> = { mentor: ['mentoring'], global: ['global'] };

/** 이 기회가 맞는 고른 관심(분야 묶음이 같거나 분류 이름이 같으면). 없으면 undefined */
export function matchedInterest(p: Program, interests: readonly Interest[]): FieldGroup | undefined {
  const g = FIELD_GROUP[p.field];
  if (interests.includes(g)) return g;
  return interests.find((i): i is FieldGroup => i !== 'unknown' && !!p.category && !!INTEREST_CATEGORY[i]?.includes(p.category));
}

/**
 * 고른 관심을 먼저 존중한다(토스 05 Context Based). 고른 관심마다 가장 높은 기회 하나씩을 맨 앞으로 모은다.
 * 그래서 고른 분야에 열린 기회가 있으면 가장 추천은 그 분야에서 나오고, 여럿 골랐으면 앞쪽에 분야마다 하나씩 들어간다.
 * 목록을 몇 개로 자르더라도 고른 분야가 빠지지 않는다. 앞에 모은 것끼리, 나머지끼리는 원래 순서를 지킨다.
 */
export function respectInterests(scored: Scored[], interests: readonly Interest[]): Scored[] {
  const front: Scored[] = [];
  for (const i of interests) {
    if (i === 'unknown') continue;
    const best = scored.find(s => !front.includes(s) && matchedInterest(s.p, [i]) === i);
    if (best) front.push(best);
  }
  const head = scored.filter(s => front.includes(s));
  return [...head, ...scored.filter(s => !front.includes(s))];
}

export const directionsOf = (profile: Profile, directions: Direction[]) => directions.filter(d => inInterests(profile.interests, d.field));

export type RankCtx = {
  catalog: Catalog;
  week: number;
  profile: Profile;
  records: RecordItem[];
  /** 이미 한(기록된) 기회 */
  doneIds: string[];
  /** 관심 없음·나중에 보기·신청 준비로 목록에서 뺀 기회 */
  excluded: string[];
  dislikedFields: Field[];
  preferEasier: boolean;
  mode: Mode;
  focusDids: Did[];
  /** 확인한 발견의 문장(일 → 문장). 에너지 발견과 자주 맡는 발견의 문장이 다르다 */
  focusStatements?: Partial<Record<Did, string>>;
  rejectedDids: Did[];
  careerOn: boolean;
  reflectOn: boolean;
  last: LastDone | null;
};

/**
 * 거르기(이번 주 모집, 마감, 신청 대상, 시간·방식, 이미 했거나 뺀 것) 뒤 가점·감점으로 정렬한다.
 * 고른 관심마다 가장 높은 하나는 맨 앞으로 모은다(respectInterests).
 * 가점: 에너지 오른 일 +2, 확인한 발견 +2(좁혀 가는 중), 진로 요건 +1(빈 요건 +1.5), 안 해 본 분야 +1(관심 모름 +2), 관심 분야 +3(분류 이름이 같아도), 마감 3일 안 +0.3.
 * 감점: 지친 일 -1.5, 관심 없는 분야 -4, 입문 선호인데 2단계 이상 -2, 지난번과 같은 분야 -2.
 */
export function rank(ctx: RankCtx): { scored: Scored[]; funnel: Funnel } {
  const { programs, reqs, jobs, directions } = ctx.catalog;
  const pool = programs.filter(p => p.weeks.includes(ctx.week));
  const open = pool.filter(p => ddayOf(p, ctx.week) >= 0);
  const eligible = open.filter(p => p.eligible);
  const fit = eligible.filter(p => p.hours <= ctx.profile.time && (ctx.profile.format === 'any' || p.format === ctx.profile.format));
  const fresh = fit.filter(p => !ctx.doneIds.includes(p.id) && !ctx.excluded.includes(p.id));
  // 해 본 분야는 학생에게 보이는 이름과 같게 분야 묶음으로 센다.
  const tried = new Set(ctx.records.map(r => FIELD_GROUP[r.field]));
  const upDids = new Set(ctx.reflectOn ? ctx.records.filter(r => r.energy === 'up').map(r => r.did).filter(d => !ctx.rejectedDids.includes(d)) : []);
  const downDids = new Set(ctx.reflectOn ? ctx.records.filter(r => r.energy === 'down').map(r => r.did) : []);
  const unknown = ctx.profile.interests.includes('unknown');
  const dirs = directionsOf(ctx.profile, directions);
  const scored = fresh.map(p => {
    let score = 0;
    const reasons: Reason[] = [];
    const energyDid = p.did.find(d => upDids.has(d));
    if (energyDid) {
      score += 2;
      const rec = [...ctx.records].reverse().find(r => r.energy === 'up' && r.did === energyDid);
      if (rec) reasons.push({ kind: 'energy', text: `${rec.title}에서 ‘${DID_LABEL[energyDid]}’ 뒤 에너지가 더 생겼다고 남겼어요.`, source: `기록 보기 · ${rec.title}`, recordId: rec.id });
    }
    if (p.did.some(d => downDids.has(d))) score -= 1.5;
    if (ctx.mode === 'focus') {
      const f = p.did.find(d => ctx.focusDids.includes(d));
      // 발견 종류마다 문장이 다르다('자주 맡아요'를 '에너지가 올라가요'로 바꿔 쓰지 않는다). 문장을 못 받으면 일 이름만 쓴다.
      if (f) { score += 2; reasons.push({ kind: 'focus', text: `맞다고 확인한 발견 ‘${ctx.focusStatements?.[f] ?? DID_LABEL[f]}’에 맞춰 골랐어요.` }); }
    }
    if (ctx.careerOn && p.career) {
      const req = reqs.find(r => r.id === p.career?.req);
      const job = req && jobs.find(j => j.id === req.job);
      if (req && job && dirs.some(d => d.reqIds.includes(req.id))) {
        score += p.career.part === 'gap' ? 1.5 : 1;
        reasons.push({
          kind: 'career',
          text: p.career.part === 'gap' ? `${job.company} ${job.short} 공고의 ‘${req.label}’ 요건에서 아직 기록이 없는 ${p.career.gapLabel} 쪽을 채워요.` : `${job.company} ${job.short} 공고의 ‘${req.label}’ 요건과 이어져요.`,
          source: `공고 원문 보기 · ${job.checkedAt} 확인`, url: job.url
        });
      }
    }
    if (ctx.mode === 'explore' && !tried.has(FIELD_GROUP[p.field])) { score += unknown ? 2 : 1; reasons.push({ kind: 'novelty', text: `아직 해 보지 않은 ‘${fieldName(p.field)}’ 분야예요. 넓게 탐색하는 중이라 섞었어요.` }); }
    const picked = matchedInterest(p, ctx.profile.interests);
    if (picked) {
      const name = picked === FIELD_GROUP[p.field] ? fieldName(p.field) : GROUP_LABEL[picked];
      score += 3;
      reasons.push({ kind: 'interest', text: `처음에 고른 관심 ‘${name}’${josa(name, '과', '와')} 맞아요.` });
    }
    if (ctx.dislikedFields.includes(p.field)) score -= 4;
    if (ctx.preferEasier && p.level > 1) score -= 2;
    if (ctx.last && p.field === ctx.last.field) score -= 2;
    if (ctx.last && p.field !== ctx.last.field) reasons.push({ kind: 'bridge', text: `지난주 ‘${ctx.last.title}’ 기록을 반영해, 같은 분야는 한 주 쉬고 다른 분야를 섞었어요.` });
    if (ddayOf(p, ctx.week) <= 3) score += 0.3;
    return { p, score, reasons };
  });
  scored.sort((a, b) => b.score - a.score);
  return { scored: respectInterests(scored, ctx.profile.interests), funnel: { pool: pool.length, open: open.length, eligible: eligible.length, fit: fit.length, fresh: fresh.length } };
}

const MAIN_ORDER: ReasonKind[] = ['energy', 'focus', 'career', 'novelty', 'interest'];
const ALL_ORDER: ReasonKind[] = [...MAIN_ORDER, 'bridge'];
/** 추천 이유 한 줄로 쓸 대표 이유 */
export const mainReason = (rs: Reason[]) => MAIN_ORDER.map(k => rs.find(r => r.kind === k)).find(Boolean);
/** 근거로 보여 줄 이유 최대 4개 */
export const sortedReasons = (rs: Reason[]) => [...rs].sort((a, b) => ALL_ORDER.indexOf(a.kind) - ALL_ORDER.indexOf(b.kind)).slice(0, 4);

/** 대안 2개: 다음 순위 하나, 그리고 두 후보와 분야가 다른 것 중 가장 높은 하나(없으면 그다음 순위). */
export function pickAlternatives(scored: Scored[], base: Program): Scored[] {
  const rest = scored.filter(s => s.p.id !== base.id);
  const a1 = rest[0];
  if (!a1) return [];
  const a2 = rest.slice(1).find(s => s.p.field !== base.field && s.p.field !== a1.p.field) ?? rest[1];
  return a2 ? [a1, a2] : [a1];
}

/** 비교 화면에서 가장 추천과 무엇이 다른지 한 줄 */
export function diffLabel(a: Program, base: Program, tried: Set<Field>, interests: Interest[]) {
  if (FIELD_GROUP[a.field] !== FIELD_GROUP[base.field] && ![...tried].some(f => FIELD_GROUP[f] === FIELD_GROUP[a.field])) return `새로운 분야 · ${fieldName(a.field)}`;
  if (a.hours < base.hours) return `더 가볍게 · ${a.format !== base.format && a.format === 'online' ? '온라인 ' : ''}${a.durationLabel}`;
  if (a.format !== base.format) return a.format === 'online' ? '온라인으로' : '직접 만나서';
  if (a.level > base.level) return '한 단계 도전';
  if (inInterests(interests, a.field)) return `관심 분야 · ${fieldName(a.field)}`;
  return `다른 일정 · ${a.when}`;
}
