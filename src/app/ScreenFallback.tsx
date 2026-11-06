import { useEffect, useState } from 'react';
import { SECTION_TABS, type Route, type SectionId } from './router';

/** 이보다 빨리 화면이 오면 뼈대를 보이지 않는다. 잠깐 번쩍이는 뼈대가 기다림보다 더 거슬린다. */
export const FALLBACK_DELAY_MS = 300;

const hasTabs = (r: Route): r is Route & { name: SectionId } =>
  (r.name === 'activities' || r.name === 'analysis') && !r.sub?.includes('interview');

/**
 * 화면 덩어리를 받는 동안의 자리. 실제 화면과 같은 틀(.os: 머리 → 구역 탭 → 본문)이라 화면이 와도 틀이 움직이지 않는다.
 * 처음 FALLBACK_DELAY_MS 동안은 투명하다. 검사 스크립트는 [data-screen-loading] 이 사라질 때까지 기다린다.
 */
export function ScreenFallback({ route }: { route: Route }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), FALLBACK_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);
  const tabs = hasTabs(route) ? SECTION_TABS[route.name] : null;
  // 추천 요약은 구역 탭 대신 화면 안 보기 탭(추천·나중에 보기 등) 한 줄이 머리 아래에 있다
  const viewTabs = route.name === 'recommend' && !route.sub;
  return (
    <div className="os app-skel" data-screen-loading="" data-shown={shown || undefined} aria-busy="true">
      <div className={`ui-page-head${tabs ? ' ui-page-head--tabs' : ''}`}>
        <span className="app-skel__bar app-skel__bar--title" />
      </div>
      {tabs && (
        <div className="ui-stabs app-skel__tabs">
          {tabs.map(t => <span key={t.path} className="app-skel__bar app-skel__bar--tab" />)}
        </div>
      )}
      {viewTabs && (
        <div className="ui-tabs app-skel__tabs app-skel__tabs--view">
          <span className="app-skel__bar app-skel__bar--tab" /><span className="app-skel__bar app-skel__bar--tab" />
        </div>
      )}
      <div className="os__body app-skel__body">
        <div className="app-skel__card"><span className="app-skel__bar" /><span className="app-skel__bar app-skel__bar--short" /></div>
        <div className="app-skel__card"><span className="app-skel__bar" /><span className="app-skel__bar app-skel__bar--short" /></div>
      </div>
      {/* 알림 칸은 처음부터 두고 글만 바꾼다(새로 붙은 알림 칸은 읽지 않는 화면 읽기 프로그램이 있다) */}
      <span className="sr-only" role="status">{shown ? '화면을 불러오고 있어요.' : ''}</span>
    </div>
  );
}
