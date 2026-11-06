// @vitest-environment jsdom
import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TOAST_MS, ToastProvider } from '../components';
import { buildManualRecord } from '../domain/interview/record';
import { rec } from '../domain/fixtures.test-util';
import type { RecordItem } from '../domain/types';
import { AppStateProvider, useApp } from './AppState';
import { useChallengeToasts } from './challenges';

let el: HTMLDivElement;
let root: Root;
const toast = () => document.querySelector('.ui-toast span')?.textContent ?? null;

/** 기록 하나를 결과 토스트와 함께 더한다(화면에서 저장 버튼을 누른 것과 같다) */
function Harness({ record, message }: { record: RecordItem; message: string }) {
  const { run } = useApp();
  useChallengeToasts();
  useEffect(() => { run({ type: 'record/add', record }, { toast: message }); }, [record, message, run]);
  return null;
}
const mount = (record: RecordItem, message: string) =>
  act(() => root.render(<ToastProvider><AppStateProvider><Harness record={record} message={message} /></AppStateProvider></ToastProvider>));

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  localStorage.clear();
  el = document.createElement('div');
  document.body.append(el);
  root = createRoot(el);
});
afterEach(() => { act(() => root.unmount()); el.remove(); vi.useRealTimers(); });

it('직접 입력한 기록은 첫 회고로 세지 않고, 결과 토스트가 그대로 남는다', () => {
  const manual = buildManualRecord({ id: 'm-1', title: '학과 스터디', note: '문제를 같이 풀었어요', quote: '', energy: 'same', date: '2학기', semester: '2026-2', group: 'dev' });
  mount(manual, '직접 입력으로 기록했어요.');
  expect(toast()).toBe('직접 입력으로 기록했어요.');
  act(() => { vi.advanceTimersByTime(TOAST_MS + 100); });
  expect(toast() ?? '').not.toContain('첫 회고');
});

it('회고로 만든 경험 카드는 첫 회고 달성이고, 결과 토스트가 먼저 뜬 뒤 달성이 뜬다', () => {
  mount(rec('a-1', { source: 'agent' }), '경험 카드를 저장했어요.');
  expect(toast()).toBe('경험 카드를 저장했어요.');
  act(() => { vi.advanceTimersByTime(TOAST_MS - 100); });
  expect(toast()).toBe('경험 카드를 저장했어요.');
  act(() => { vi.advanceTimersByTime(600); });
  expect(toast()).toMatch(/^‘첫 회고’/);
});
