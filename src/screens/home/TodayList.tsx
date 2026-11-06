import { openEntity } from '../../app/entity';
import { hrefOf } from '../../app/router';
import { Icon, Panel } from '../../components';
import type { WeekGroup, WeekTask, WeekTaskKind } from '../../domain/homeStatus';

/** 묶음 머리가 할 일 이름을 한 번만 말한다. 줄에는 활동 이름과 때만 */
const GROUP_NAME: Record<WeekTaskKind, string> = { deadline: '신청 마감', review: '회고 쓰기', meet: '모임' };
const GHOST: { kind: WeekTaskKind; line: string }[] = [
  { kind: 'deadline', line: '신청을 준비하면 마감이 생겨요' },
  { kind: 'review', line: '활동을 마치면 생겨요. 지난 활동은 기록 탭에서 직접 남겨요' }
];

/**
 * 오늘의 퀘스트(둘째 층, 할 일): 이번 주 할 일을 종류별로. 줄 전체가 그 일(신청 준비, 회고 쓰기, 활동 보기)로 간다.
 * 카드 높이는 옆 열에 맞추고, 다 못 보이면 이 목록만 안에서 스크롤한다(홈에서 안에서 스크롤하는 칸은 이것 하나).
 */
export function TodayList({ groups }: { groups: WeekGroup[] }) {
  const count = groups.reduce((n, g) => n + g.tasks.length, 0);

  return (
    <Panel title="오늘의 퀘스트" className="home-today" bodyClassName="home-today__body" action={count > 0 ? <span className="home-today__n num">이번 주 {count}개</span> : undefined} data-fill>
      {count === 0 ? (
        <>
          {/* '마감은 없어요'라고 하면 바로 옆 추천 카드의 'D-3 마감'과 부딪힌다. 이 칸은 내가 챙길 일만 센다 */}
          <p className="home-today__none">이번 주 챙길 일은 아직 없어요</p>
          {/* 아직 없는 묶음은 이름과 생기는 때만 옅게: 이 칸이 무엇이 될지 보인다 */}
          {GHOST.map(g => (
            <section key={g.kind} className="home-q" data-ghost aria-label={`${GROUP_NAME[g.kind]}: ${g.line}`}>
              <h3 className="ui-subhead home-q__h" aria-hidden="true">{GROUP_NAME[g.kind]}</h3>
              <p className="home-q__ghost" aria-hidden="true">{g.line}</p>
            </section>
          ))}
        </>
      ) : (
        <>
          {groups.map(g => (
            <section key={g.kind} className="home-q" aria-labelledby={`home-q-${g.kind}`}>
              <h3 id={`home-q-${g.kind}`} className="ui-subhead home-q__h" data-kind={g.kind}>{GROUP_NAME[g.kind]}<span className="num">{g.tasks.length}</span></h3>
              <ul>
                {g.tasks.map(t => <li key={t.id}><TaskRow t={t} /></li>)}
              </ul>
            </section>
          ))}
        </>
      )}
    </Panel>
  );
}

function TaskRow({ t }: { t: WeekTask }) {
  const body = (
    <>
      <span className="home-q__title">{t.title}</span>
      <span className="home-q__when num" data-urgent={t.urgent || undefined}>{t.when}</span>
      <Icon name="chevron" size={14} />
    </>
  );
  if ('path' in t.target) return <a className="home-q__row" href={hrefOf(t.target.path)} aria-label={t.label}>{body}</a>;
  const target = t.target;
  return <button type="button" className="home-q__row" aria-label={t.label} onClick={() => openEntity(target)}>{body}</button>;
}
