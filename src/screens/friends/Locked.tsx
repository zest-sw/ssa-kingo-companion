import { navigate } from '../../app/router';
import { useOverviewState } from '../../app/useOverviewState';
import { Button, Card, Icon, PageHeader, type IconName } from '../../components';

const BRANCHES: { id: string; icon: IconName; label: string; line: string }[] = [
  { id: 'friends', icon: 'friends', label: '친구', line: '비슷한 학생과' },
  { id: 'recruit', icon: 'flag', label: '팀원 모집', line: '함께할 사람' },
  { id: 'hall', icon: 'trophy', label: '명예의 전당', line: '먼저 걸은 길' }
];

const toVisibility = () => navigate('settings/visibility');

/** 친구 L1(비공개): 공개하면 열리는 세 갈래를 점선 그림으로 보여 준다. 어느 조각을 눌러도 공개 범위 설정으로 간다. */
export function Locked() {
  useOverviewState<null>('friends', null);
  return (
    <>
      <PageHeader title="친구" />
      <Card>
        <div className="fr-unlock">
          <svg className="fr-unlock__lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 50 C50 50 50 17 100 17" />
            <path d="M0 50 L100 50" />
            <path d="M0 50 C50 50 50 83 100 83" />
          </svg>
          <button type="button" className="fr-node fr-node--me" onClick={toVisibility} aria-label="내 프로필, 지금은 비공개예요. 공개 범위 설정으로 가요">
            <span className="fr-avatar fr-avatar--lg" aria-hidden="true">나</span>
            <span className="fr-node__label">내 프로필</span>
            <span className="fr-node__line"><Icon name="lock" size={12} />비공개</span>
          </button>
          <ul className="fr-unlock__branches">
            {BRANCHES.map(b => (
              <li key={b.id}>
                <button type="button" className="fr-node fr-node--locked" onClick={toVisibility} aria-label={`${b.label}, 공개하면 열려요. 공개 범위 설정으로 가요`}>
                  <span className="fr-node__icon" aria-hidden="true"><Icon name={b.icon} size={20} /></span>
                  <span className="fr-node__text">
                    <span className="fr-node__label">{b.label}</span>
                    <span className="fr-node__line">{b.line}</span>
                  </span>
                  <Icon name="lock" size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="fr-unlock__go"><Button variant="primary" onClick={toVisibility}>설정에서 공개하기</Button></div>
      </Card>
    </>
  );
}
