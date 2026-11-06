// @vitest-environment jsdom
import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useFocusOnChange } from './useFocusOnChange';

let el: HTMLDivElement;
let root: Root;

function Steps({ step, onMount = false }: { step: number; onMount?: boolean }) {
  const head = useRef<HTMLHeadingElement>(null);
  useFocusOnChange(head, step, { onMount });
  return <><button type="button">다음</button><h2 ref={head} tabIndex={-1}>질문 {step}</h2></>;
}
function Form({ editing }: { editing: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  useFocusOnChange(() => box.current?.querySelector('button'), editing, { when: !editing });
  return <div ref={box}>{editing ? <textarea defaultValue="한 일" /> : <button type="button">고치기</button>}</div>;
}
function Field({ index }: { index: number }) {
  const f = useRef<HTMLTextAreaElement>(null);
  useFocusOnChange(f, index, { onMount: true, caretEnd: true });
  return <textarea ref={f} defaultValue="배운 점" />;
}
const render = (node: React.ReactNode) => act(() => root.render(node));
const active = () => document.activeElement?.textContent;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  el = document.createElement('div');
  document.body.append(el);
  root = createRoot(el);
});
afterEach(() => { act(() => root.unmount()); el.remove(); });

describe('useFocusOnChange', () => {
  it('첫 그림은 건너뛰고(앱 틀이 제목에 준다), 단계가 바뀌면 새 제목으로 옮긴다', () => {
    render(<Steps step={1} />);
    expect(document.activeElement).toBe(document.body);
    render(<Steps step={2} />);
    expect(active()).toBe('질문 2');
  });

  it('onMount 면 나타날 때도 옮긴다', () => {
    render(<Steps step={1} onMount />);
    expect(active()).toBe('질문 1');
  });

  it('같은 값으로 다시 그리면 초점을 건드리지 않는다', () => {
    render(<Steps step={1} />);
    el.querySelector('button')!.focus();
    render(<Steps step={1} />);
    expect(active()).toBe('다음');
  });

  it('when 이 거짓인 변화(폼 열기)에는 옮기지 않고, 닫을 때만 고치기로 돌려준다', () => {
    render(<Form editing={false} />);
    expect(document.activeElement).toBe(document.body);
    render(<Form editing />);
    expect(document.activeElement).toBe(document.body);
    render(<Form editing={false} />);
    expect(active()).toBe('고치기');
  });

  it('caretEnd 면 입력 칸 글 끝에 커서를 둔다', () => {
    render(<Field index={0} />);
    const t = document.activeElement as HTMLTextAreaElement;
    expect(t.tagName).toBe('TEXTAREA');
    expect(t.selectionStart).toBe(t.value.length);
  });
});
