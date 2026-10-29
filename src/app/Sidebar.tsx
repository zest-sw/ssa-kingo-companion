import { CountBadge, Icon } from '../components';
import { useApp } from './AppState';
import { hrefOf, NAV, type RouteName } from './router';

export function Sidebar({ current }: { current: RouteName }) {
  const { view } = useApp();
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
              <a className="app-nav__link" href={hrefOf(item.id)} aria-current={current === item.id ? 'page' : undefined} title={item.label}>
                <Icon name={item.icon} />
                <span className="app-nav__label">{item.label}</span>
                {item.id === 'recommend' && <CountBadge count={view.newCount} label="새 후보" />}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="app-side__foot">
        <div className="app-student">
          <span className="app-student__avatar" aria-hidden="true">성</span>
          <span className="app-student__text">
            <b>소프트웨어학과</b>
            <span>3학년 · 예시 학생</span>
          </span>
        </div>
        <a className="app-gear" href={hrefOf('settings')} aria-label="설정" title="설정" aria-current={current === 'settings' ? 'page' : undefined}>
          <Icon name="settings" />
        </a>
      </div>
    </aside>
  );
}
