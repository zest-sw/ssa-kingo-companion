import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { Badge, Button, Card, Drawer, EmptyState, Icon, Modal, SegmentedControl } from '../../components';
import { FIELD_GROUP, GROUP_LABEL } from '../../domain/vocab';
import { HALL, type HallEntry } from '../../data/friends';

type Filter = 'all' | HallEntry['group'];
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: '전체' }, { id: 'ai', label: GROUP_LABEL.ai }, { id: 'dev', label: GROUP_LABEL.dev },
  { id: 'plan', label: GROUP_LABEL.plan }, { id: 'mentor', label: GROUP_LABEL.mentor }, { id: 'global', label: GROUP_LABEL.global }
];

function Timeline({ entry }: { entry: HallEntry }) {
  return (
    <ol className="fr-timeline">
      {entry.path.map(step => (
        <li key={step.title} className="fr-timeline__item">
          <span className={`ui-field__dot ui-field__dot--${FIELD_GROUP[step.field]}`} aria-hidden="true" />
          <span className="fr-timeline__title">{step.title}</span>
          <span className="fr-timeline__when num">{step.when}</span>
        </li>
      ))}
    </ol>
  );
}

export function HallView() {
  const { state, run } = useApp();
  const consent = state.visibility.hallOfFameConsent;
  const [filter, setFilter] = useState<Filter>('all');
  const [asking, setAsking] = useState(false);
  const [open, setOpen] = useState<HallEntry | null>(null);
  const list = HALL.filter(h => filter === 'all' || h.group === filter);

  const join = () => {
    run({ type: 'visibility/set', patch: { hallOfFameConsent: true } }, { toast: '명예의 전당에 올라가요. 설정에서 언제든 내릴 수 있어요.' });
    setAsking(false);
  };
  const leave = () => run({ type: 'visibility/set', patch: { hallOfFameConsent: false } }, { toast: '명예의 전당에서 내렸어요.' });

  return (
    <>
      <Card className="fr-consent" padding="md">
        <div className="fr-consent__text">
          <p className="fr-consent__title">{consent ? '내가 명예의 전당에 올라가 있어요' : '명예의 전당에 올라갈지 정해요'}</p>
          <p className="fr-consent__sub">{consent ? '공개한 활동 경로와 고른 회고가 전시돼요.' : '공개한 학생 중 따로 동의한 학생만 올라가요.'}</p>
        </div>
        <Badge tone="dashed" icon="info">선정 기준과 운영 주체는 검토 중이에요</Badge>
        {consent ? <Button onClick={leave}>내리기</Button> : <Button variant="primary" onClick={() => setAsking(true)}>올라가기</Button>}
      </Card>

      <div className="fr-hall-filter"><SegmentedControl label="분야" items={FILTERS} value={filter} onChange={setFilter} /></div>

      {list.length === 0 ? (
        <Card><EmptyState icon="trophy" message="이 분야의 경로는 아직 없어요. 다른 분야를 살펴보세요." action={<Button size="sm" onClick={() => setFilter('all')}>전체 보기</Button>} /></Card>
      ) : (
        <ul className="fr-hall">
          {list.map(h => (
            <li key={h.id} className="ui-card fr-hall__card">
              <div className="fr-person">
                <span className="fr-avatar" aria-hidden="true">{h.name.slice(0, 1)}</span>
                <div className="fr-person__text"><p className="fr-person__name">{h.name}</p><p className="fr-person__sub">{h.dept} · {h.year}학년</p></div>
              </div>
              <div className="fr-reason"><p className="fr-reason__label">선정 이유</p><p>{h.reason}</p></div>
              <p className="fr-hall__start">{h.start}</p>
              <Timeline entry={h} />
              {h.retro && <blockquote className="fr-quote"><span className="fr-quote__label">공개한 회고</span>{h.retro}</blockquote>}
              <Button block className="fr-hall__btn" onClick={() => setOpen(h)}>경로 따라 보기</Button>
            </li>
          ))}
        </ul>
      )}

      <p className="fr-note"><Icon name="check" size={16} />순위와 점수는 없어요. 결과보다 거쳐 온 활동을 보여 줘요.</p>

      <Drawer open={open !== null} title={open ? `${open.name}님의 경로` : ''} eyebrow={open?.dept} onClose={() => setOpen(null)}>
        {open && (
          <div className="fr-stack">
            <div className="fr-reason"><p className="fr-reason__label">선정 이유</p><p>{open.reason}</p></div>
            <p className="fr-hall__start">{open.start}</p>
            <Timeline entry={open} />
            {open.retro && <blockquote className="fr-quote"><span className="fr-quote__label">공개한 회고</span>{open.retro}</blockquote>}
            <p className="fr-empty">같은 길을 따라가야 하는 건 아니에요. 마음이 가는 활동 하나만 골라 봐도 돼요.</p>
          </div>
        )}
      </Drawer>

      <Modal
        open={asking}
        title="명예의 전당에 올라갈까요?"
        onClose={() => setAsking(false)}
        actions={<><Button onClick={() => setAsking(false)}>그만둘게요</Button><Button variant="primary" onClick={join}>올라갈게요</Button></>}
      >
        <p>프로필 공개와 따로 받는 동의예요. 공개한 활동 경로와 고른 회고가 다른 학생에게 전시돼요. 순위와 점수는 없고, 언제든 내릴 수 있어요.</p>
      </Modal>
    </>
  );
}
