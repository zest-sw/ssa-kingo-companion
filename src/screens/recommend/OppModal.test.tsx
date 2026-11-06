// @vitest-environment jsdom
import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { AppStateProvider, useApp } from '../../app/AppState';
import { ToastProvider } from '../../components';
import { PROGRAMS } from '../../data/catalog';
import { OppModal } from './OppModal';

let el: HTMLDivElement;
let root: Root;
const p = PROGRAMS[0];
const noop = () => {};
const actions = { onPrepare: noop, onLater: noop, onDismiss: noop };
const buttons = () => [...document.querySelectorAll('button')].map(b => b.textContent);

/** 관심 없음으로 뺀 상태에서 모달을 연다. state 는 화면 밖에서 읽는다. */
function Harness({ dismissed, onState }: { dismissed: boolean; onState: (c: string | undefined) => void }) {
  const { state, run } = useApp();
  useEffect(() => { if (dismissed) run({ type: 'candidate/choose', programId: p.id, choice: 'dismissed' }); }, [dismissed, run]);
  useEffect(() => { onState(state.choices[p.id]); }, [state.choices, onState]);
  return <OppModal programId={p.id} actions={actions} onClose={noop} />;
}

let choice: string | undefined;
const mount = (dismissed: boolean) => act(() => root.render(<ToastProvider><AppStateProvider><Harness dismissed={dismissed} onState={c => { choice = c; }} /></AppStateProvider></ToastProvider>));

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  el = document.createElement('div');
  document.body.append(el);
  root = createRoot(el);
});
afterEach(() => { act(() => root.unmount()); el.remove(); });

it('뺀 적 없는 기회는 관심 없음 버튼을 보인다', () => {
  mount(false);
  expect(buttons()).toContain('관심 없음');
  expect(buttons()).not.toContain('추천에 다시 넣기');
});

it('관심 없음으로 뺀 기회는 토스트가 지난 뒤에도 모달에서 추천에 다시 넣는다', () => {
  mount(true);
  expect(choice).toBe('dismissed');
  expect(buttons()).not.toContain('관심 없음');
  const back = [...document.querySelectorAll('button')].find(b => b.textContent === '추천에 다시 넣기')!;
  act(() => { back.click(); });
  expect(choice).toBeUndefined();
});

it('머리에는 이름과 D-n 만 두고, 분류·주최는 정의 목록 첫 줄로 내린다', () => {
  mount(false);
  const head = document.querySelector('.ui-modal__head') as HTMLElement;
  expect(head.querySelector('.ui-modal__eyebrow, .ui-badge, .ui-chip')).toBeNull();
  const title = head.querySelector('h2')?.textContent ?? '';
  expect(title.startsWith(p.title)).toBe(true);
  expect(title.slice(p.title.length)).toMatch(/^D/);
  expect(document.querySelector('.rec-dl dt')?.textContent).toBe('종류');
});
