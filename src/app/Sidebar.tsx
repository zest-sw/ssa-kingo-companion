import { CountBadge, Icon } from '../components';
import { useApp } from './AppState';
import { studentCard } from './student';
import { hrefOf, inProfile, NAV, navMatch, PROFILE, type Route } from './router';

/**
 * 메인 메뉴 4개와 왼쪽 아래 학생 카드(프로필). 지금 위치의 부모만 하위 항목을 펼친다. 하위 화면은 그 항목이, 흐름 화면(신청 준비·회고 인터뷰)은 가장 가까운 항목이 활성이다.
 * 좁은 폭(아이콘만)에서는 하위 항목을 숨기고, 부모를 누르면 요약 화면의 카드로 하위에 간다.
 */
export function Sidebar({ route }: { route: Route }) {
  const { state, view } = useApp();
  const me = studentCard(state.demo, state.profile);
  const at = navMatch(route);
  // 화면 자체면 'page', 그 아래 흐름 화면이면 'location'
  const mark = (on: boolean) => (on ? (at.exact ? 'page' : 'location') : undefined);
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
          {NAV.map(item => {
            const open = at.item?.id === item.id;
            return (
              <li key={item.id}>
                <a
                  className={`app-nav__link${open && at.child ? ' app-nav__link--parent' : ''}`}
                  href={hrefOf(item.path)}
                  aria-current={mark(open && !at.child)}
                  title={item.label}
                >
                  <Icon name={item.icon} />
                  <span className="app-nav__label">{item.label}</span>
                  {item.id === 'recommend' && <CountBadge count={view.newCount} label="새 후보" />}
                </a>
                {open && item.children && (
                  <ul className="app-nav__sub" aria-label={`${item.label} 하위 메뉴`}>
                    {item.children.map(c => (
                      <li key={c.path}>
                        <a className="app-nav__sublink" href={hrefOf(c.path)} aria-current={mark(at.child?.path === c.path)}>{c.label}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="app-side__foot">
        <a className="app-student" href={hrefOf('profile')} aria-label={PROFILE.label} title={PROFILE.label} aria-current={inProfile(route) ? (route.sub ? 'location' : 'page') : undefined}>
          <span className="app-student__avatar" aria-hidden="true">나</span>
          <span className="app-student__text">
            <b>{me.name}</b>
            <span>{me.sub}</span>
          </span>
        </a>
        <a className="app-gear" href={hrefOf('settings')} aria-label="설정" title="설정" aria-current={route.name === 'settings' ? 'page' : undefined}>
          <Icon name="settings" />
        </a>
      </div>
    </aside>
  );
}
