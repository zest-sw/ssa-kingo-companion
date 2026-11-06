// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeDrawer, drawerHref, openDrawer, parseDrawer, resetDrawerHistory, useDrawerOf } from './drawerUrl';
import { navigate } from './router';

let el: HTMLDivElement;
let root: Root;
let api: ReturnType<typeof useDrawerOf> | undefined;

function Strength() {
  api = useDrawerOf('strength');
  return <p>{api.id ?? '닫힘'}</p>;
}
// 브라우저 뒤로 가기 대신: 주소를 바꾸고 hashchange 를 바로 보낸다
const goBackTo = (hash: string) => act(() => { history.replaceState(null, '', hash); window.dispatchEvent(new HashChangeEvent('hashchange')); });
// 주소 바꾸기의 hashchange 는 jsdom 에서 다음 차례에 온다
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  history.replaceState(null, '', '#/analysis/strengths?x=1');
  resetDrawerHistory();
  el = document.createElement('div');
  document.body.append(el);
  root = createRoot(el);
});
afterEach(() => { act(() => root.unmount()); el.remove(); vi.restoreAllMocks(); });

describe('서랍 주소 규칙', () => {
  it('종류:id 를 읽고 쓴다. id 없는 서랍과 다른 상태는 그대로 둔다', () => {
    expect(parseDrawer(new URLSearchParams('drawer=record:e4'))).toEqual({ kind: 'record', id: 'e4' });
    expect(parseDrawer(new URLSearchParams('drawer=stage:data.1'))).toEqual({ kind: 'stage', id: 'data.1' });
    expect(parseDrawer(new URLSearchParams('drawer=ratio'))).toEqual({ kind: 'ratio', id: '' });
    expect(parseDrawer(new URLSearchParams('tab=all'))).toBeNull();
    expect(drawerHref('#/analysis/map?x=1', { kind: 'edge', id: 'f1' })).toBe('analysis/map?x=1&drawer=edge:f1');
    expect(drawerHref('#/analysis/map?drawer=edge:f1&x=1', undefined)).toBe('analysis/map?x=1');
  });

  it('열면 기록을 하나 쌓고, 닫으면 뒤로 가기로 닫힌다', async () => {
    act(() => root.render(<Strength />));
    expect(el.textContent).toBe('닫힘');
    const before = history.length;
    act(() => api!.open('data'));
    await flush();
    expect(location.hash).toBe('#/analysis/strengths?x=1&drawer=strength:data');
    expect(history.length).toBe(before + 1);
    expect(el.textContent).toBe('data');
    const back = vi.spyOn(history, 'back').mockImplementation(() => goBackTo('#/analysis/strengths?x=1'));
    act(() => api!.close());
    await flush();
    expect(back).toHaveBeenCalledTimes(1);
    expect(el.textContent).toBe('닫힘');
  });

  it('뒤로 가기(주소에서 서랍이 빠짐)로 닫히고, 주소로 바로 열 수 있다', () => {
    history.replaceState(null, '', '#/analysis/strengths?drawer=strength:growth');
    act(() => root.render(<Strength />));
    expect(el.textContent).toBe('growth');
    goBackTo('#/analysis/strengths');
    expect(el.textContent).toBe('닫힘');
  });

  it('주소로 바로 연 서랍은 닫을 때 뒤로 가지 않고 주소에서 뺀다', async () => {
    history.replaceState(null, '', '#/analysis/strengths?drawer=strength:growth');
    act(() => root.render(<Strength />));
    const back = vi.spyOn(history, 'back');
    act(() => api!.close());
    await flush();
    expect(back).not.toHaveBeenCalled();
    expect(location.hash).toBe('#/analysis/strengths');
    expect(el.textContent).toBe('닫힘');
  });

  it('열린 서랍에서 다른 서랍을 열면 기록을 바꿔 쓰고, 닫고 바로 옮기면 닫기는 하지 않는다', async () => {
    act(() => root.render(<Strength />));
    act(() => openDrawer({ kind: 'strength', id: 'data' }));
    await flush();
    const after = history.length;
    const back = vi.spyOn(history, 'back');
    act(() => { closeDrawer(); openDrawer({ kind: 'record', id: 'e4' }); });
    await flush();
    expect(history.length).toBe(after);
    expect(location.hash).toBe('#/analysis/strengths?x=1&drawer=record:e4');
    act(() => { closeDrawer(); navigate('recommend'); });
    await flush();
    expect(back).not.toHaveBeenCalled();
    expect(location.hash).toBe('#/recommend');
  });

  it('한 번 닫는 동안 두 번 불려도 뒤로 가기는 한 번', async () => {
    act(() => root.render(<Strength />));
    act(() => api!.open('data'));
    await flush();
    const back = vi.spyOn(history, 'back').mockImplementation(() => {});
    act(() => { api!.close(); api!.close(); });
    await flush();
    expect(back).toHaveBeenCalledTimes(1);
  });
});
