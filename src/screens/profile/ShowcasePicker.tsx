import type { ChallengeView } from '../../app/challenges';
import { Button, Drawer, EmptyState, Icon } from '../../components';
import { pickShowcase, SHOWCASE_MAX } from '../../domain/challenges/showcase';
import { formatDay, RarityTag } from './RarityTag';

type Props = { open: boolean; onClose: () => void; items: ChallengeView[]; chosen: string[]; onChange: (ids: string[]) => void };

/**
 * 프로필 쇼케이스 고르기(스팀 쇼케이스처럼 학생이 고른다): 달성한 과제 중 1~3개. 누른 순서대로 전시된다.
 * 프로필에 보이는 건 고른 과제뿐이고, 총 개수·완료율은 친구에게 보이지 않는다.
 */
export function ShowcasePicker({ open, onClose, items, chosen, onChange }: Props) {
  const done = items.filter(c => c.achieved);
  const full = chosen.length >= SHOWCASE_MAX;
  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="프로필 쇼케이스"
      title="전시할 과제 고르기"
      footer={<Button variant="primary" block onClick={onClose}>다 골랐어요</Button>}
    >
      <p className="pf-pick__lead">
        <span>최대 {SHOWCASE_MAX}개까지 골라요. 공개했을 때 친구에게는 고른 과제만 보여요.</span>
        <span className="num pf-pick__count" aria-live="polite">{chosen.length} / {SHOWCASE_MAX}</span>
      </p>
      {done.length === 0 ? (
        <EmptyState icon="trophy" message="아직 달성한 과제가 없어요. 회고 하나를 쓰면 첫 과제가 열려요." />
      ) : (
        <ul className="pf-pick">
          {done.map(c => {
            const on = chosen.includes(c.def.id);
            const order = chosen.indexOf(c.def.id) + 1;
            return (
              <li key={c.def.id}>
                <button
                  type="button"
                  className={`pf-pick__item${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  disabled={!on && full}
                  onClick={() => onChange(pickShowcase(chosen, c.def.id))}
                >
                  <span className="pf-pick__mark num" aria-hidden="true">{on ? order : ''}</span>
                  <Icon name={c.def.icon} size={20} />
                  <span className="pf-pick__text">
                    <b>{c.def.name}</b>
                    <span>{c.achievedAt ? `${formatDay(c.achievedAt)} 달성` : '달성했어요'}</span>
                  </span>
                  <RarityTag rarity={c.def.rarity} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {full && done.length > SHOWCASE_MAX && <p className="fr-empty pf-pick__full">칸이 다 찼어요. 바꾸려면 하나를 먼저 빼요.</p>}
    </Drawer>
  );
}
