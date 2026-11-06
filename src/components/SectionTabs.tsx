import { useRef, type KeyboardEvent } from 'react';
import { useIndicator } from './useIndicator';

export type SectionTab = { href: string; label: string; current: boolean };

/**
 * 구역 탭: 내 활동·나의 분석의 하위 화면으로 가는 링크 줄. 페이지 머리 바로 아래, 화면마다 같은 자리·같은 높이.
 * 화면 안 내용을 바꾸는 Tabs(role=tablist)와 달리 주소를 바꾸는 이동이라 링크 + aria-current="page" 다.
 * Tab 키로 칸마다 가고, 왼쪽·오른쪽 화살표·Home·End 로도 옮긴다.
 */
export function SectionTabs({ label, items }: { label: string; items: SectionTab[] }) {
  const root = useRef<HTMLElement>(null);
  useIndicator(root, '[aria-current="page"]', items.find(t => t.current)?.href);
  const onKey = (e: KeyboardEvent) => {
    const links = [...(root.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])];
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (i < 0) return;
    const n = links.length;
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    links[next].focus();
  };
  return (
    <nav ref={root} className="ui-stabs" aria-label={label} onKeyDown={onKey}>
      {items.map(t => (
        <a key={t.href} className="ui-stabs__tab" href={t.href} data-label={t.label} aria-current={t.current ? 'page' : undefined}>{t.label}</a>
      ))}
    </nav>
  );
}
