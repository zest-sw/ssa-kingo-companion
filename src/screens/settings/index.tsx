import type { ReactNode } from 'react';
import { hrefOf, type ScreenProps } from '../../app/router';
import { Icon, PageHeader } from '../../components';
import { SETTINGS_NAV, type SettingsSection } from '../../data/settings';
import { AboutSection } from './AboutSection';
import { DataSection } from './DataSection';
import { NotifySection } from './NotifySection';
import { ProfileSection } from './ProfileSection';
import { VisibilitySection } from './VisibilitySection';
import './settings.css';

const BODY: Record<SettingsSection, () => ReactNode> = {
  profile: () => <ProfileSection />,
  visibility: () => <VisibilitySection />,
  data: () => <DataSection />,
  notifications: () => <NotifySection />,
  about: () => <AboutSection />
};

/** 설정(#/settings/<id>). 사이드바 아래 톱니바퀴로 연다. 왼쪽 하위 메뉴, 오른쪽 내용. */
export default function SettingsScreen({ sub }: ScreenProps) {
  const current = SETTINGS_NAV.find(n => n.id === sub) ?? SETTINGS_NAV[0];
  return (
    <>
      <PageHeader eyebrow="설정" title={current.label} />
      <div className="st-layout">
        <nav className="st-nav" aria-label="설정 메뉴">
          <ul>
            {SETTINGS_NAV.map(n => (
              <li key={n.id}>
                <a className="st-nav__link" href={hrefOf(`settings/${n.id}`)} aria-current={n.id === current.id ? 'page' : undefined}>
                  <Icon name={n.icon} />
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="st-body" key={current.id}>{BODY[current.id]()}</div>
      </div>
    </>
  );
}
