import { navigate } from '../../app/router';
import { Button, Card, Icon, type IconName } from '../../components';

/** 비공개 상태에서 소셜 화면 대신 보이는 한 화면. 무엇이 열리는지만 알리고 공개를 재촉하지 않는다. */
export function Gate({ opens }: { opens: { icon: IconName; title: string; sub: string }[] }) {
  return (
    <Card className="fr-gate">
      <div className="fr-gate__head">
        <span className="fr-gate__icon"><Icon name="lock" size={24} /></span>
        <h2 className="fr-gate__title">공개하면 열려요</h2>
        <p className="fr-gate__sub">지금은 내 기록을 나만 봐요. 공개하면 아래를 쓸 수 있고, 언제든 거둘 수 있어요.</p>
      </div>
      <ul className="fr-gate__list">
        {opens.map(o => (
          <li key={o.title} className="fr-gate__item">
            <span className="fr-gate__item-icon"><Icon name={o.icon} size={20} /></span>
            <div><p className="fr-gate__item-title">{o.title}</p><p className="fr-gate__item-sub">{o.sub}</p></div>
          </li>
        ))}
      </ul>
      <Button variant="primary" onClick={() => navigate('friends/visibility')}>공개 설정 보기</Button>
    </Card>
  );
}
