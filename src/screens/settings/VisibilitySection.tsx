import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { Badge, Button, Card, Chip, Drawer, Icon, Modal, SegmentedControl, type IconName } from '../../components';
import { isSensitive, publicActivities, toggled } from '../../domain/social';
import { Group, Row } from './Row';

const UNLOCKS: { icon: IconName; title: string; sub: string; hall?: true }[] = [
  { icon: 'friends', title: '친구', sub: '비슷한 학생과 서로 친구 맺기' },
  { icon: 'flag', title: '팀원 모집', sub: '대회·해커톤 팀원을 구하거나 지원하기' },
  { icon: 'trophy', title: '명예의 전당', sub: '한 번 더 동의하면 걸어온 길이 올라가요', hall: true }
];

type Shown = { tone: 'green' | 'neutral' | 'lock'; text: string };
const SHOWN: { title: string; sub: string; shown: Shown }[] = [
  { title: '한 활동 목록', sub: '활동명, 분야, 시기', shown: { tone: 'green', text: '하나씩 뺄 수 있어요' } },
  { title: '경험 카드', sub: '한 장씩 고르기', shown: { tone: 'neutral', text: '고른 것만' } },
  { title: '발견, 역량 근거', sub: '분석 결과', shown: { tone: 'lock', text: '항상 나만 봐요' } },
  { title: '민감한 활동', sub: '종교·정치 동아리 등', shown: { tone: 'lock', text: '기본으로 빠져요' } }
];

type Pick = 'activity' | 'record';

/**
 * 공개 범위. 공개는 따로 동의를 받고, 철회는 한 번에.
 * 한 칸에 한 주제: 왼쪽은 공개 여부(+ 열리는 기능 셋), 오른쪽은 보일 것 고르기(활동·회고를 하나씩). '공개하면 보이는 것' 표는 서랍으로.
 */
export function VisibilitySection() {
  const { state, run } = useApp();
  const v = state.visibility;
  const [asking, setAsking] = useState(false);
  const [guide, setGuide] = useState(false);
  const [pick, setPick] = useState<Pick>('activity');

  const candidates = state.activities.filter(a => (a.status === 'ongoing' || a.status === 'ended' || a.status === 'recorded') && !isSensitive(a));
  const visibleIds = new Set(publicActivities(state.activities, { ...v, profilePublic: true }).map(a => a.id));

  const publish = () => {
    run({ type: 'visibility/set', patch: { profilePublic: true } }, { toast: '프로필을 공개했어요. 친구에게만 보여요.' });
    setAsking(false);
  };
  // 되돌리기를 달지 않는다: 다시 공개하려면 동의 창을 거쳐야 한다. 명예의 전당 동의도 reducer 에서 함께 거둔다.
  const withdraw = () => run({ type: 'visibility/set', patch: { profilePublic: false } }, { toast: '비공개로 돌렸어요. 이제 나만 봐요.' });
  const set = (patch: Partial<typeof v>) => run({ type: 'visibility/set', patch });

  return (
    <div className="st-stack st-vis">
      <Card className="st-card">
        <div className="st-status">
          <span className={v.profilePublic ? 'st-status__dot st-status__dot--on' : 'st-status__dot'} aria-hidden="true" />
          <div className="st-status__text">
            <p className="st-status__value">{v.profilePublic ? '공개' : '비공개'}</p>
            <p className="st-status__sub">{v.profilePublic ? '친구에게만 보여요' : '나만 봐요'}</p>
          </div>
          {v.profilePublic
            ? <Button onClick={withdraw}>비공개로 돌리기</Button>
            : <Button variant="primary" onClick={() => setAsking(true)}>프로필 공개하기</Button>}
        </div>
        <div className="st-cols">
          <Group title={v.profilePublic ? '지금 쓸 수 있어요' : '공개하면 쓸 수 있어요'} action={<Button size="sm" variant="ghost" icon="chevron" onClick={() => navigate('profile')}>내 프로필 보기</Button>}>
            <ul className="st-rows">
              {UNLOCKS.map(u => (
                <Row key={u.title} title={<><Icon name={u.icon} />{u.title}</>} sub={u.sub}>
                  {/* 세 줄이 같은 상태면 묶음 제목이 이미 말한다. 공개 뒤에도 따로 동의가 필요한 전당만 상태를 단다 */}
                  {u.hall && v.profilePublic && (v.hallOfFameConsent ? <Badge tone="green">올라가 있어요</Badge> : <Badge tone="neutral">동의 전</Badge>)}
                </Row>
              ))}
            </ul>
          </Group>
        </div>
        <div className="st-guide"><Button size="sm" variant="ghost" icon="chevron" onClick={() => setGuide(true)}>공개하면 무엇이 보이나요?</Button></div>
      </Card>

      <Card className="st-card st-pick" title="보일 것 고르기" action={<SegmentedControl<Pick> label="보일 것 종류" value={pick} onChange={setPick} items={[{ id: 'activity', label: '한 활동' }, { id: 'record', label: '경험 카드' }]} />}>
        <p className="st-pick__hint">{v.profilePublic ? '켜진 것만 친구에게 보여요' : '미리 골라 두면 공개할 때 이것만 보여요'}</p>
        {pick === 'activity' && <Group title="">
          {candidates.length ? (
            <div className="st-chips">
              {candidates.map(a => <Chip key={a.id} selected={visibleIds.has(a.id)} onClick={() => set({ hiddenActivityIds: toggled(v.hiddenActivityIds, a.id) })}>{a.title}</Chip>)}
            </div>
          ) : <p className="st-empty">보일 활동이 아직 없어요. 활동을 시작하면 여기서 골라요</p>}
        </Group>}
        {pick === 'record' && <Group title="">
          {state.records.length ? (
            <div className="st-chips">
              {state.records.map(r => <Chip key={r.id} selected={v.sharedRecordIds.includes(r.id)} onClick={() => set({ sharedRecordIds: toggled(v.sharedRecordIds, r.id) })}>{r.title}</Chip>)}
            </div>
          ) : <p className="st-empty">공개할 경험 카드가 아직 없어요. 활동이 끝나면 회고를 써 보세요</p>}
        </Group>}
      </Card>

      <p className="st-note"><Icon name="check" />언제든 비공개로 돌릴 수 있어요. 돌리면 친구 찾기, 팀원 모집, 명예의 전당도 멈춰요</p>

      <Drawer open={guide} onClose={() => setGuide(false)} eyebrow="공개 범위" title="공개하면 무엇이 보이나요?">
        <ul className="st-rows">
          {SHOWN.map(x => (
            <Row key={x.title} title={x.title} sub={x.sub}>
              {x.shown.tone === 'lock' ? <Badge tone="neutral" icon="lock">{x.shown.text}</Badge> : <Badge tone={x.shown.tone}>{x.shown.text}</Badge>}
            </Row>
          ))}
        </ul>
      </Drawer>

      <Modal
        open={asking}
        title="친구에게 프로필을 공개해요"
        onClose={() => setAsking(false)}
        actions={<><Button onClick={() => setAsking(false)}>취소</Button><Button variant="primary" onClick={publish}>공개하기</Button></>}
      >
        <p>가입 동의와 따로 받는 동의예요. 한 활동은 친구에게 보이고, 경험 카드는 고른 것만 보여요. 발견과 역량 근거는 다른 사람에게 보이지 않아요.</p>
      </Modal>
    </div>
  );
}
