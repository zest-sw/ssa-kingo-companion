import type { MouseEvent } from 'react';
import { navigate } from '../../app/router';

type VTDocument = Document & { startViewTransition?: (cb: () => Promise<void>) => unknown };

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 전당 장면이 그려질 때까지 기다린다(해시가 바뀌고 React 가 다음 화면을 그리는 데 잠깐 걸린다).
 * 전환 중에는 브라우저가 프레임을 멈춰 requestAnimationFrame 이 오지 않으니 타이머로 본다.
 */
function sceneReady(): Promise<void> {
  return new Promise(resolve => {
    let n = 0;
    const tick = () => (document.querySelector('.hall-scene') || ++n > 40 ? resolve() : setTimeout(tick, 10));
    setTimeout(tick, 0);
  });
}

/**
 * 문 카드를 누르면 문이 커지며 전당 장면으로 넘어간다(View Transitions API, 0.6초).
 * API 가 없으면 링크 그대로 넘어가고 장면 쪽 CSS 가 들어서는 움직임을 맡는다. 움직임 줄이기면 바로 넘어간다.
 */
export function enterHall(e: MouseEvent<HTMLAnchorElement>, path: string) {
  const doc = document as VTDocument;
  if (!doc.startViewTransition || reduced() || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  e.currentTarget.style.setProperty('view-transition-name', 'hall-door');
  doc.startViewTransition(() => { navigate(path); return sceneReady(); });
}

/** 장면 쪽 CSS 들어서기 움직임을 쓸지: View Transitions 가 맡으면 겹치지 않게 끈다 */
export const cssEnter = () => typeof document !== 'undefined' && !(document as VTDocument).startViewTransition;
