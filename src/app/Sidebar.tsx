import { CountBadge, Icon } from '../components';
import { useApp } from './AppState';
import { studentCard } from './student';
import { hrefOf, inProfile, NAV, navMatch, PROFILE, type Route } from './router';

/**
 * 메인 메뉴 4개(1단 고정)와 왼쪽 아래 학생 카드(프로필)·설정. 누르거나 옮겨도 펼치거나 밀지 않는다(결정 2026-11-04).
 * 하위 화면은 페이지 안 구역 탭이 맡고, 사이드바는 그 구역 항목에 지금 위치를 표시한다(하위·흐름 화면도 구역 항목이 활성).
 */
export function Sidebar({ route }: { route: Route }) {
  const { state, view } = useApp();
  const me = studentCard(state.demo, state.profile);
  const at = navMatch(route);
  // 구역 요약 자체면 'page', 그 아래 하위·흐름 화면이면 'location'
  const mark = (on: boolean) => (on ? (at.exact && !at.child ? 'page' : 'location') : undefined);
  return (
    <aside className="app-side">
      <a className="app-brand" href={hrefOf('home')}>
        <svg className="app-brand__mark" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 14.5C7.5 14.5 3.5 11 3.5 4.5c3 .3 5.8 1.4 8.5 3.6 2.7-2.2 5.5-3.3 8.5-3.6 0 6.5-4 10-8.5 10z" fill="currentColor" />
          <path d="M12 8.5v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="app-brand__name">킹고 컴패니언</span>
      </a>
      <nav aria-label="주 메뉴">
        <ul className="app-nav">
          {NAV.map(item => (
            <li key={item.id}>
              <a className="app-nav__link" href={hrefOf(item.path)} aria-current={mark(at.item?.id === item.id)}>
                <Icon name={item.icon} />
                <span className="app-nav__label">{item.label}</span>
                {item.id === 'recommend' && state.onboarded && <CountBadge count={view.newCount} label="새 후보" />}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="app-side__foot">
        <a className="app-student" href={hrefOf('profile')} aria-label={PROFILE.label} title={PROFILE.label} aria-current={inProfile(route) ? (route.sub ? 'location' : 'page') : undefined}>
          <span className="app-student__avatar" aria-hidden="true">나</span>
          <span className="app-student__text">
            <b>{me.name}</b>
            <span data-keep={state.demo || undefined}>{me.sub}</span>
          </span>
        </a>
        <a className="app-gear" href={hrefOf('settings')} aria-label="설정" title="설정" aria-current={route.name === 'settings' ? 'page' : undefined}>
          <Icon name="settings" />
        </a>
      </div>
    </aside>
  );
}
