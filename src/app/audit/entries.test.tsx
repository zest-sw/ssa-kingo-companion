// @vitest-environment jsdom
/**
 * 진입점 점검(docs/design/ia-navigation.md 2·4절): 경로마다 앱을 그려, 한 화면 안에서 같은 목적지로 가는 링크·버튼·탭이 몇 개인지 센다.
 * 사이드바는 빼고 센다(이동은 사이드바가 맡는다). 목적지마다 1개 이하여야 한다.
 *
 *   npm run audit:entries   표와 함께 이 점검만 돌린다(npm run check 에도 들어 있다)
 *
 * 세는 법
 * - 링크: href 가 '#/' 로 시작하면 그 경로. 옛 경로는 새 경로로 바꿔 센다.
 * - 버튼: 하나씩 눌러 navigate() 가 불린 경로. replace 로 부른 것(그만두기 뒤 돌아가기, 옛 경로 넘김)은 진입점이 아니라 결과라서 세지 않는다.
 * - 빼는 것: 사이드바(.app-side), 본문 건너뛰기, 질문 칸(role="search": 예시 질문은 서로 다른 질문이다), 비활성 버튼.
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ list: [] as string[] }));
vi.mock('../router', async importOriginal => {
  const real = await importOriginal<typeof import('../router')>();
  return { ...real, navigate: (path: string, opts: { replace?: boolean } = {}) => { if (!opts.replace) calls.list.push(path); } };
});

import App from '../App';
import { movedPath } from '../router';
import { INITIAL_STATE, NEW_STUDENT_STATE, type AppState } from '../state';
import { saveState } from '../storage';
import { CATALOG } from '../../data/catalog';
import { buildCandidates } from '../../domain/candidates';

const view = buildCandidates({
  catalog: CATALOG, week: INITIAL_STATE.week, profile: INITIAL_STATE.profile, records: INITIAL_STATE.records, confirm: INITIAL_STATE.confirm,
  settings: INITIAL_STATE.settings, choices: {}, dislikedFields: [], preferEasier: false, last: INITIAL_STATE.lastDone
});
const top = view.primary?.p.id ?? 'none';
const alt = view.alternatives[0]?.p.id ?? 'none';
const ended = INITIAL_STATE.activities.find(a => a.status === 'ended')?.id ?? 'none';

/** fresh: 가입 인터뷰를 마친 새 학생(활동·기록 0). 빈 상태 버튼이 같은 화면의 다른 진입점과 겹치지 않는지 본다. */
type Case = { path: string; public?: boolean; fresh?: boolean; overview?: Record<string, unknown> };
const CASES: Case[] = [
  { path: 'home' },
  { path: 'recommend' }, { path: `recommend/${top}` }, { path: `recommend/${alt}` }, { path: `recommend/prepare/${top}` },
  { path: 'activities' },
  { path: 'activities/schedule' }, { path: 'activities/schedule/board' }, { path: 'activities/schedule/list' },
  { path: 'activities/schedule', overview: { 'activities/schedule': { sel: { view: 'board' } } } },
  { path: 'activities/schedule', overview: { 'activities/schedule': { sel: { view: 'list' } } } },
  { path: 'activities/records' }, { path: 'activities/records/portfolio' }, { path: 'activities/records/interview' }, { path: `activities/records/interview/${ended}` },
  { path: 'analysis' }, { path: 'analysis/techtree' }, { path: 'analysis/map' }, { path: 'analysis/flow' }, { path: 'analysis/strengths' },
  { path: 'profile' }, { path: 'profile/friends' }, { path: 'profile/recruit' }, { path: 'profile/hall' },
  { path: 'profile', public: true }, { path: 'profile/friends', public: true }, { path: 'profile/recruit', public: true }, { path: 'profile/hall', public: true },
  { path: 'settings/profile' }, { path: 'settings/visibility' }, { path: 'settings/data' }, { path: 'settings/notifications' }, { path: 'settings/about' },
  ...['home', 'recommend', 'activities', 'activities/schedule', 'activities/schedule/board', 'activities/schedule/list', 'activities/records', 'activities/records/portfolio', 'activities/records/interview',
    'analysis', 'analysis/techtree', 'analysis/map', 'analysis/flow', 'analysis/strengths', 'profile'].map(path => ({ path, fresh: true }))
];

const SKIP = '.app-side, .app-skip, [role="search"]';
const norm = (path: string) => { const p = path.replace(/^#?\/?/, '').replace(/\/+$/, ''); return movedPath(p) ?? p; };
const nameOf = (el: Element) => (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);

let root: Root | undefined;
let host: HTMLElement;

async function mount(c: Case) {
  if (root) act(() => root!.unmount());
  document.body.innerHTML = '';
  localStorage.clear();
  sessionStorage.clear();
  const base = c.fresh ? NEW_STUDENT_STATE : INITIAL_STATE;
  const state: AppState = { ...base, onboarded: true, visibility: { ...base.visibility, profilePublic: !!c.public } };
  saveState(state);
  if (c.overview) sessionStorage.setItem('kingo-companion:overview', JSON.stringify(c.overview));
  history.replaceState(null, '', '#/' + c.path);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => { root!.render(<App />); });
  // 분석 중·초안 쓰는 중 같은 기다림을 끝까지 보낸다.
  await act(async () => { vi.advanceTimersByTime(5000); });
}

const targets = () => [...document.querySelectorAll<HTMLElement>('a[href], button')].filter(el => !el.closest(SKIP) && !(el as HTMLButtonElement).disabled);

/** 경로 하나의 목적지별 진입점 */
async function entriesOf(c: Case): Promise<Map<string, string[]>> {
  await mount(c);
  const found = new Map<string, string[]>();
  const add = (dest: string, el: Element) => found.set(dest, [...(found.get(dest) ?? []), nameOf(el)]);
  // 처음 그린 화면의 목록을 순서대로 누른다. 앞 버튼이 화면을 바꿔 다음 것이 사라졌으면 새로 그리고 같은 순번을 누른다.
  let list = targets();
  const count = list.length;
  for (let i = 0; i < count; i++) {
    let el = list[i];
    if (!el?.isConnected) { await mount(c); list = targets(); el = list[i]; }
    if (!el) continue;
    if (el.tagName === 'A') {
      const href = el.getAttribute('href') ?? '';
      if (href.startsWith('#/')) add(norm(href), el);
      continue;
    }
    calls.list = [];
    await act(async () => { el.click(); });
    for (const p of new Set(calls.list.map(norm))) add(p, el);
  }
  return found;
}

const label = (c: Case) => `${c.path}${c.public ? ' (공개)' : ''}${c.fresh ? ' (새 학생)' : ''}${c.overview ? ` (${JSON.stringify(Object.values(c.overview)[0])})` : ''}`;

describe('진입점 점검: 같은 목적지는 화면마다 하나', () => {
  const report: string[] = [];
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    window.scrollTo = () => {};
    Element.prototype.scrollIntoView = () => {};
    Element.prototype.scrollTo = () => {};
    window.open = () => null;
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });
  afterAll(() => {
    if (root) act(() => root!.unmount());
    vi.useRealTimers();
    console.log(['', '경로 | 목적지 수 | 가장 많은 목적지', ...report].join('\n'));
  });

  it.each(CASES.map(c => [label(c), c] as const))('%s', async (_name, c) => {
    const found = await entriesOf(c);
    const dupes = [...found].filter(([, names]) => names.length > 1);
    const worst = [...found].sort((a, b) => b[1].length - a[1].length)[0];
    report.push(`${label(c)} | ${found.size} | ${worst ? `${worst[0]} ×${worst[1].length}` : '-'}`);
    expect(dupes.map(([dest, names]) => `${dest} ← ${names.join(' / ')}`)).toEqual([]);
  }, 60_000);
});
