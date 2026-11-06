// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Modal } from './Modal';
import { Toast, TOAST_MS } from './Toast';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

function mount(node: React.ReactNode) {
  const el = document.createElement('div');
  document.body.append(el);
  const root = createRoot(el);
  act(() => root.render(node));
  return { el, root };
}

it('토스트는 5초 뒤 닫히고, 마우스를 올린 동안은 멈춘다', () => {
  const onClose = vi.fn();
  const { el } = mount(<Toast message="뺐어요." actionLabel="되돌리기" onAction={() => {}} timeout={TOAST_MS} onClose={onClose} />);
  const box = el.querySelector('.ui-toast')!;
  act(() => { vi.advanceTimersByTime(3000); });
  // React 는 mouseenter 를 mouseover 로 듣는다
  act(() => { box.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })); });
  act(() => { vi.advanceTimersByTime(10000); });
  expect(onClose).not.toHaveBeenCalled();
  act(() => { box.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })); });
  act(() => { vi.advanceTimersByTime(1900); });
  expect(onClose).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(200); });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('동작 버튼은 하나이고 이름은 actionLabel 이다(옛 onUndo 는 되돌리기)', () => {
  const onAction = vi.fn();
  const { el } = mount(<><Toast message="a" actionLabel="다시 넣기" onAction={onAction} /><Toast message="b" onUndo={() => {}} /></>);
  const buttons = [...el.querySelectorAll('button')].map(b => b.textContent);
  expect(buttons).toEqual(['다시 넣기', '되돌리기']);
  act(() => { el.querySelector('button')!.click(); });
  expect(onAction).toHaveBeenCalledTimes(1);
});

it('모달은 닫힐 때 바로 지우지 않고 움직임이 끝난 뒤 지운다', () => {
  const { root } = mount(<Modal open title="지울까요?" onClose={() => {}} actions={null} />);
  expect(document.querySelector('.ui-modal')).not.toBeNull();
  act(() => root.render(<Modal open={false} title="지울까요?" onClose={() => {}} actions={null} />));
  expect(document.querySelector('.ui-scrim')?.getAttribute('data-state')).toBe('closing');
  act(() => { vi.advanceTimersByTime(500); });
  expect(document.querySelector('.ui-modal')).toBeNull();
});
