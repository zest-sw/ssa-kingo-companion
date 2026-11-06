import { useEffect, useState } from 'react';
import { skeletonOf, type SkeletonShape } from '../screens/sizes';
import { SECTION_TABS, screenLabel, type Route, type SectionId } from './router';

/** 이보다 빨리 화면이 오면 뼈대를 보이지 않는다. 잠깐 번쩍이는 뼈대가 기다림보다 더 거슬린다. */
export const FALLBACK_DELAY_MS = 300;

const hasTabs = (r: Route): r is Route & { name: SectionId } =>
  (r.name === 'activities' || r.name === 'analysis') && !r.sub?.includes('interview');

/** 막대 몇 줄. 마지막 줄은 짧다 */
const Lines = ({ n = 2 }: { n?: number }) => (
  <>{Array.from({ length: n }, (_, i) => <span key={i} className={`app-skel__bar${i === n - 1 ? ' app-skel__bar--short' : ''}`} />)}</>
);
const Card = ({ tall, short, rows }: { tall?: boolean; short?: boolean; rows?: number }) => (
  <div className="app-skel__card" data-tall={tall || undefined} data-short={short || undefined}>
    {rows ? <><span className="app-skel__bar app-skel__bar--short" />{Array.from({ length: rows }, (_, i) => <div key={i} className="app-skel__row"><Lines /></div>)}</> : <Lines />}
  </div>
);

/** 경로마다 본문 첫 모양(src/screens/sizes.ts skeletonOf) */
function Body({ shape }: { shape: SkeletonShape }) {
  switch (shape) {
    case 'list': return <><Card short /><Card rows={4} /></>;
    case 'flow': return <Card />;
    case 'panel': return <Card tall />;
    case 'week': return <><Card tall /><div className="app-skel__col"><Card short /><Card /></div></>;
    case 'nav': return <><div className="app-skel__nav"><Lines n={5} /></div><Card tall /></>;
    case 'side': case 'split': return <><Card /><Card /></>;
  }
}

/**
 * 화면 덩어리를 받는 동안의 자리. 실제 화면과 같은 틀(.os: 머리 → 구역 탭 → 본문)이고, 본문은 경로마다 그 화면의 첫 모양이다.
 * 제목은 이미 아는 화면 이름을 바로 쓴다(기다리는 동안에도 어디인지 안다). 흐름 화면·설정처럼 제목이 내용에 따라 바뀌면 막대.
 * 처음 FALLBACK_DELAY_MS 동안은 투명하다. 검사 스크립트는 [data-screen-loading] 이 사라질 때까지 기다린다.
 */
export function ScreenFallback({ route }: { route: Route }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), FALLBACK_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);
  const shape = skeletonOf(route);
  const flow = shape === 'flow';
  const tabs = hasTabs(route) ? SECTION_TABS[route.name] : null;
  // 추천 요약은 구역 탭 대신 화면 안 보기 탭(추천·나중에 보기 등) 한 줄이 머리 아래에 있다
  const viewTabs = route.name === 'recommend' && !route.sub;
  // 프로필 하위(친구·팀원 모집·명예의 전당)와 흐름 화면은 제목 위에 빵부스러기 한 줄, 설정은 구역 이름 한 줄
  const crumb = flow || (route.name === 'profile' && !!route.sub);
  const title = flow || route.name === 'settings' ? undefined : screenLabel(route);
  return (
    <div className="os app-skel" data-screen-loading="" data-shown={shown || undefined} aria-busy="true" data-flow={flow || undefined} data-shape={shape}>
      <div className={`ui-page-head${tabs ? ' ui-page-head--tabs' : ''}`}>
        <div className="ui-page-head__text">
          {crumb && <div className="ui-crumbs app-skel__crumbs"><span className="app-skel__bar app-skel__bar--crumb" /></div>}
          {route.name === 'settings' && <p className="ui-page-head__eyebrow" aria-hidden="true">설정</p>}
          {title ? <p className="ui-page-head__title" aria-hidden="true">{title}</p> : <span className="app-skel__bar app-skel__bar--title" />}
        </div>
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
      <div className="os__body app-skel__body"><Body shape={shape} /></div>
      {/* 알림 칸은 처음부터 두고 글만 바꾼다(새로 붙은 알림 칸은 읽지 않는 화면 읽기 프로그램이 있다) */}
      <span className="sr-only" role="status">{shown ? '화면을 불러오고 있어요.' : ''}</span>
    </div>
  );
}
