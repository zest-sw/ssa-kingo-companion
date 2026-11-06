import { navigate } from '../../app/router';
import { Button, Card, Icon, type IconName } from '../../components';

type Opens = { icon: IconName; title: string; sub: string }[];

/** 공개하면 보일 모습의 윤곽. 항목마다 점선 원(사람·글) + 점선 줄 둘. 값은 그리지 않는다. */
function Preview({ opens }: { opens: Opens }) {
  return (
    <div className="fr-gate__preview" aria-hidden="true">
      <p className="fr-gate__preview-title">공개하면 이렇게 보여요</p>
      <ul className="fr-gate__ghosts">
        {opens.map(o => (
          <li key={o.title} className="fr-gate__ghost">
            <span className="fr-gate__ghost-dot" />
            <span className="fr-gate__ghost-lines"><span className="fr-gate__ghost-name">{o.title}</span><span className="fr-gate__ghost-line" /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 비공개 상태에서 소셜 화면 대신 보이는 한 화면. 다른 화면과 같은 본문 폭(왼쪽 안내 + 오른쪽 미리보기)을 쓴다. 공개를 재촉하지 않는다. */
export function Gate({ opens }: { opens: Opens }) {
  return (
    <div className="fr-cols fr-cols--gate">
      <Card className="fr-gate">
        <div className="fr-gate__head">
          <span className="fr-gate__icon"><Icon name="lock" size={20} /></span>
          <h2 className="fr-gate__title">공개하면 열려요</h2>
          <p className="fr-gate__sub">지금은 나만 봐요. 공개해도 언제든 비공개로 돌릴 수 있어요.</p>
        </div>
        <ul className="fr-gate__list">
          {opens.map(o => (
            <li key={o.title} className="fr-gate__item">
              <span className="fr-gate__item-icon"><Icon name={o.icon} size={20} /></span>
              <div><p className="fr-gate__item-title">{o.title}</p><p className="fr-gate__item-sub">{o.sub}</p></div>
            </li>
          ))}
        </ul>
        <Button variant="primary" onClick={() => navigate('settings/visibility')}>공개 범위 정하기</Button>
      </Card>
      <Preview opens={opens} />
    </div>
  );
}
