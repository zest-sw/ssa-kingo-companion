// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppStateProvider } from '../../../app/AppState';
import { ToastProvider } from '../../../components';
import HomeScreen from '..';

let el: HTMLDivElement;
let root: Root;
const saved = () => Object.values({ ...localStorage }).find(v => /"onboarded":true/.test(v));
const button = (name: string) => {
  const b = [...el.querySelectorAll('button')].find(x => x.firstChild?.textContent === name || x.textContent === name);
  if (!b) throw new Error(`버튼 없음: ${name}`);
  return b;
};
const click = (name: string) => act(() => { button(name).click(); });
const enter = (target: Element) => act(() => { target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  el = document.createElement('div');
  document.body.append(el);
  root = createRoot(el);
  act(() => root.render(<ToastProvider><AppStateProvider><HomeScreen sub={undefined} /></AppStateProvider></ToastProvider>));
});
afterEach(() => { act(() => root.unmount()); el.remove(); });

describe('가입 인터뷰', () => {
  it('마지막 버튼을 누르는 즉시 고른 관심 분야가 저장되고, 기다림 없이 끝 장면이 나온다', () => {
    click('멘토링');
    click('다음');
    click('다음');
    expect(saved()).toBeUndefined();
    click('이번 주 활동 보기');
    // 타이머를 돌리지 않아도 이미 저장돼 있다(예전에는 1.5초 뒤에 저장해, 그 사이에 떠나면 사라졌다)
    expect(saved()).toContain('"interests":["mentor"]');
    expect(el.querySelector('h1')?.textContent).toMatch(/^이번 주 추천 \d개를 골랐어요$/);
    expect(el.querySelector('.onb-pick__title')?.textContent).toBeTruthy();
    click('홈으로');
    expect(el.querySelector('.onb')).toBeNull();
  });

  it('Enter 로 다음, 관심 분야를 고르기 전에는 넘어가지 않는다', () => {
    const q = () => el.querySelector('h1')!;
    enter(q());
    expect(q().textContent).toBe('요즘 관심 가는 걸 골라 주세요');
    click('아직 모르겠어요');
    enter(q());
    expect(q().textContent).toBe('한 주에 쓸 수 있는 시간과 방식은요?');
    enter(q());
    enter(el.querySelector('input')!);
    expect(saved()).toContain('"interests":["unknown"]');
  });

  it('끝 장면의 주 버튼은 가장 추천의 신청 준비로 바로 가고, Enter 도 같다', () => {
    click('멘토링'); click('다음'); click('다음'); click('이번 주 활동 보기');
    location.hash = '';
    click('신청 준비');
    expect(location.hash).toMatch(/^#\/recommend\/prepare\/p-/);
    location.hash = '';
    enter(el.querySelector('h1')!);
    expect(location.hash).toMatch(/^#\/recommend\/prepare\/p-/);
  });

  it("'아직 모르겠어요'는 다른 선택을 지우고, 4번째 분야는 고르지 않는다", () => {
    click('개발'); click('AI·데이터'); click('창업·기획'); click('멘토링');
    const on = () => [...el.querySelectorAll('.onb-field[aria-pressed="true"] b')].map(b => b.textContent);
    expect(on()).toEqual(['개발', 'AI·데이터', '창업·기획']);
    click('아직 모르겠어요');
    expect(on()).toEqual(['아직 모르겠어요']);
  });
});
