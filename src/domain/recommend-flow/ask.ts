import type { Field, Program } from '../types';
import { needsTeam } from './flow';

// '에이전트에게 묻기': 실제 AI 없이 낱말을 추천 필터 조건으로 바꾼다. 조건은 추천 목록(#/recommend/list)이 받아 적용한다.

export type AskFilter = { evening?: boolean; team?: boolean; fresh?: boolean; online?: boolean; offline?: boolean; short?: boolean; words?: string[] };

export const ASK_EXAMPLES = ['이번 주 저녁에 할 수 있는 것', '팀으로 하는 대회', '안 해 본 분야'] as const;

const RULES: { key: Exclude<keyof AskFilter, 'words'>; re: RegExp }[] = [
  { key: 'evening', re: /저녁|밤|퇴근|야간/ },
  { key: 'team', re: /팀|대회|공모전|해커톤|같이|함께/ },
  { key: 'fresh', re: /안 ?해 ?본|새로운|처음|다른 분야|낯선/ },
  { key: 'online', re: /온라인|비대면|집에서/ },
  { key: 'offline', re: /오프라인|대면|직접 ?(가|만나)/ },
  { key: 'short', re: /짧|가벼|1시간|한 시간|잠깐/ }
];
const STOP = new Set(['이번', '주에', '할', '수', '있는', '것', '하는', '해', '줘', '추천', '활동', '뭐', '알려', '보여', '찾아', '분야']);

/** 문장에서 조건을 뽑는다. 아무 규칙에도 안 걸린 낱말(2글자 이상)은 제목·요약 검색어로 쓴다. */
export function parseAsk(text: string): AskFilter {
  const f: AskFilter = {};
  let rest = text;
  for (const { key, re } of RULES) {
    if (re.test(text)) {
      f[key] = true;
      rest = rest.replace(new RegExp(re, 'g'), ' ');
    }
  }
  const words = rest
    .split(/[\s,.?!]+/)
    .map(w => w.replace(/(으로|에서|이|가|을|를|은|는|에|의|로)$/, ''))
    .filter(w => w.length >= 2 && !STOP.has(w));
  if (words.length) f.words = words;
  return f;
}

export const isEmptyFilter = (f: AskFilter) => !Object.values(f).some(v => (Array.isArray(v) ? v.length > 0 : v));

/** 칩으로 보여 줄 조건 이름 */
export function filterLabels(f: AskFilter): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  if (f.evening) out.push({ key: 'evening', label: '저녁' });
  if (f.team) out.push({ key: 'team', label: '팀 활동' });
  if (f.fresh) out.push({ key: 'fresh', label: '안 해 본 분야' });
  if (f.online) out.push({ key: 'online', label: '온라인' });
  if (f.offline) out.push({ key: 'offline', label: '직접 만남' });
  if (f.short) out.push({ key: 'short', label: '짧은 활동' });
  for (const w of f.words ?? []) out.push({ key: `word:${w}`, label: `‘${w}’` });
  return out;
}

export function withoutKey(f: AskFilter, key: string): AskFilter {
  if (key.startsWith('word:')) {
    const words = (f.words ?? []).filter(w => w !== key.slice(5));
    return { ...f, words: words.length ? words : undefined };
  }
  return { ...f, [key]: undefined };
}

/** 'MM.DD(요일) HH:MM' 에서 시작 시각(시). 시각이 없으면 undefined */
export const startHour = (p: Program): number | undefined => {
  const m = /(\d{1,2}):\d{2}/.exec(p.when);
  return m ? Number(m[1]) : undefined;
};

/** tried: 이미 기록이 있는 분야. 모든 조건을 만족해야 남는다. */
export function matchesAsk(p: Program, f: AskFilter, tried: ReadonlySet<Field>): boolean {
  if (f.evening) {
    const h = startHour(p);
    if (h === undefined || h < 17) return false;
  }
  if (f.team && !(needsTeam(p) || p.target.includes('팀'))) return false;
  if (f.fresh && tried.has(p.field)) return false;
  if (f.online && p.format !== 'online') return false;
  if (f.offline && p.format !== 'offline') return false;
  if (f.short && p.hours > 1.5) return false;
  if (f.words?.length && !f.words.some(w => `${p.title} ${p.summary} ${p.host}`.includes(w))) return false;
  return true;
}
