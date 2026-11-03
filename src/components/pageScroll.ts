/**
 * 페이지(html)는 스크롤하지 않고 본문 칸(앱 틀의 [data-scroll-root])이 스크롤한다.
 * 화면 맨 위로 보내기·스크롤 위치 되살리기는 window 대신 이 함수들을 쓴다. 본문 칸이 없으면(테스트, 단독 렌더) 아무것도 하지 않는다.
 */
export function pageScroller(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('[data-scroll-root]');
}

export function pageScrollTop(): number {
  return pageScroller()?.scrollTop ?? 0;
}

export function setPageScrollTop(top: number) {
  const el = pageScroller();
  if (el) el.scrollTop = top;
}

/** 본문 칸 스크롤을 듣는다. 해제 함수를 돌려준다 */
export function onPageScroll(cb: () => void): () => void {
  const el = pageScroller();
  if (!el) return () => undefined;
  el.addEventListener('scroll', cb, { passive: true });
  return () => el.removeEventListener('scroll', cb);
}
