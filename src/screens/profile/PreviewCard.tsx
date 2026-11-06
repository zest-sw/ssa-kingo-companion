import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { interestLine } from '../../app/student';
import { Button, Card, Icon } from '../../components';
import { profilePreview, type PreviewCard as CardData } from '../../domain/profilePreview';
import { FIELD_GROUP } from '../../domain/vocab';

const toVisibility = () => navigate('settings/visibility');

/**
 * 친구가 보는 내용 그대로. 바깥 카드 안에 또 카드를 두지 않고(K11) 한 겹으로 그린다.
 * ghost 면 아직 공개 전이라 글자를 옅게 하고 아바타만 옅은 실선 윤곽으로 그린다.
 */
function FriendCard({ card, sub, interests, ghost }: { card: CardData; sub?: string; interests: string; ghost?: boolean }) {
  return (
    <article className={`pf-friend${ghost ? ' pf-friend--ghost' : ''}`} aria-label={ghost ? '공개하면 친구가 보는 카드' : '친구가 보는 카드'}>
      <header className="pf-friend__head">
        <span className="fr-avatar fr-avatar--lg" aria-hidden="true">나</span>
        <div>
          <p className="pf-friend__name">나</p>
          {sub && <p className="pf-friend__sub">{sub}</p>}
        </div>
      </header>
      <dl className="pf-friend__rows">
        <div className="pf-friend__row">
          <dt>관심 분야</dt>
          <dd>{interests || <span className="pf-friend__empty">고른 분야가 없어요</span>}</dd>
        </div>
        <div className="pf-friend__row">
          <dt>한 활동</dt>
          <dd><span className="num pf-friend__num">{card.activityCount}</span>개</dd>
        </div>
        <div className="pf-friend__row">
          <dt>경험 카드</dt>
          <dd>
            {card.records.length ? (
              <ul className="pf-friend__records">
                {card.records.map(r => (
                  <li key={r.id} className="fr-path">
                    <span className={`ui-field__dot ui-field__dot--${FIELD_GROUP[r.field]}`} aria-hidden="true" />
                    <span>{r.title}</span>
                  </li>
                ))}
                {card.moreRecords > 0 && <li className="pf-friend__more num">{card.moreRecords}장 더</li>}
              </ul>
            ) : <span className="pf-friend__empty">고른 회고가 없어요. 회고를 쓰고 공개 범위에서 고르면 보여요</span>}
          </dd>
        </div>
      </dl>
      <ul className="pf-friend__hidden" aria-label="친구에게 안 보이는 것">
        {card.hidden.map(h => <li key={h}><Icon name="lock" size={14} /><span>{h}</span><span className="pf-friend__hidden-tag">숨김</span></li>)}
      </ul>
    </article>
  );
}

/**
 * 프로필의 주인공: 친구에게 실제로 보일 카드. 숨긴 것은 빠지고 그 자리에 옅은 '숨김' 줄이 남는다.
 * 공개 범위를 바꾸는 길은 설정 › 공개 범위 하나뿐이라 여기에는 그 버튼만 둔다(토글을 또 두지 않는다).
 * 비공개면 '지금은 나만 봐요'와 공개하면 쓸 수 있는 것, 그리고 공개하면 보일 카드의 윤곽(Value First).
 */
export function PreviewCard() {
  const { state } = useApp();
  const p = profilePreview(state.activities, state.records, state.visibility);
  const props = { card: p.card, sub: state.demo ? '소프트웨어학과 3학년' : undefined, interests: interestLine(state.profile) };

  if (!p.open) {
    return (
      <Card className="pf-preview" padding="md" aria-label="내 프로필 공개 상태">
        <div className="pf-preview__closed">
          <p className="pf-preview__status"><Icon name="lock" size={16} />지금은 나만 봐요</p>
          <p className="pf-preview__sub">공개하면 친구 찾기, 팀원 모집, 명예의 전당을 쓸 수 있어요.</p>
          <Button variant="primary" onClick={toVisibility}>공개 범위 정하기</Button>
        </div>
        <p className="pf-preview__ghost-label">공개하면 친구에게 이렇게 보여요</p>
        <FriendCard {...props} ghost />
      </Card>
    );
  }

  return (
    <Card className="pf-preview" padding="md" aria-label="친구에게 보이는 내 프로필">
      <div className="pf-preview__bar">
        <p className="pf-preview__status"><Icon name="eye" size={16} />{p.status}</p>
        <Button size="sm" variant="ghost" icon="chevron" onClick={toVisibility}>공개 범위 바꾸기</Button>
      </div>
      <FriendCard {...props} />
    </Card>
  );
}
