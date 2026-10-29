import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { useChallenges } from '../../app/challenges';
import { navigate } from '../../app/router';
import { Badge, Button, Card, Chip, Icon, Modal, type IconName } from '../../components';
import { isSensitive, publicActivities, toggled } from '../../domain/social';
import { showcaseable } from '../../domain/challenges';
import { Group, Row } from './Row';

const UNLOCKS: { icon: IconName; title: string; sub: string }[] = [
  { icon: 'friends', title: '친구 찾기', sub: '비슷한 학생과 서로 친구 맺기' },
  { icon: 'flag', title: '팀원 모집', sub: '대회·해커톤 팀원을 구하고 지원하기' },
  { icon: 'trophy', title: '명예의 전당', sub: '선정되면 한 번 더 동의한 뒤 전시' }
];

type Shown = { tone: 'green' | 'neutral' | 'lock'; text: string };
const SHOWN: { title: string; sub: string; shown: Shown }[] = [
  { title: '한 활동 목록', sub: '활동명, 분야, 시기', shown: { tone: 'green', text: '보여요 · 하나씩 뺄 수 있어요' } },
  { title: '회고', sub: '활동마다 고르기', shown: { tone: 'neutral', text: '고른 것만' } },
  { title: '도전 과제 전시', sub: '프로필에 올릴 것 고르기', shown: { tone: 'neutral', text: '고른 것만' } },
  { title: '발견, 역량 근거', sub: '분석 결과', shown: { tone: 'lock', text: '항상 나만 봐요' } },
  { title: '민감한 활동', sub: '종교·정치 동아리 등', shown: { tone: 'lock', text: '기본으로 빠져요' } }
];

/** 공개 범위. 친구 화면의 '공개 설정' 탭에서 옮겨 왔다. 공개는 따로 동의를 받고, 철회는 한 번에. */
export function VisibilitySection() {
  const { state, run } = useApp();
  const challenges = useChallenges();
  const v = state.visibility;
  const [asking, setAsking] = useState(false);

  const candidates = state.activities.filter(a => (a.status === 'ongoing' || a.status === 'ended' || a.status === 'recorded') && !isSensitive(a));
  const visibleIds = new Set(publicActivities(state.activities, { ...v, profilePublic: true }).map(a => a.id));
  const achieved = challenges.filter(c => c.achieved);
  const showcased = new Set(showcaseable(challenges, v.showcaseChallengeIds));

  const publish = () => {
    run({ type: 'visibility/set', patch: { profilePublic: true } }, { toast: '프로필을 공개했어요. 설정에서 언제든 거둘 수 있어요.' });
    setAsking(false);
  };
  // 되돌리기를 달지 않는다: 다시 공개하려면 동의 창을 거쳐야 한다. 명예의 전당 동의도 reducer 에서 함께 거둔다.
  const withdraw = () => run({ type: 'visibility/set', patch: { profilePublic: false } }, { toast: '프로필을 비공개로 돌렸어요.' });
  const set = (patch: Partial<typeof v>) => run({ type: 'visibility/set', patch });

  return (
    <div className="st-stack">
      <Card className="st-card">
        <div className="st-status">
          <span className={v.profilePublic ? 'st-status__dot st-status__dot--on' : 'st-status__dot'} aria-hidden="true" />
          <div className="st-status__text">
            <p className="st-status__value">{v.profilePublic ? '공개' : '비공개'}</p>
            <p className="st-status__sub">{v.profilePublic ? '한 활동 목록이 친구에게 보여요' : '내 기록은 나만 봐요'}</p>
          </div>
          {v.profilePublic
            ? <Button onClick={withdraw}>비공개로 돌리기</Button>
            : <Button variant="primary" onClick={() => setAsking(true)}>프로필 공개하기</Button>}
        </div>
        <div className="st-cols">
          <Group title="공개하면 쓸 수 있어요" action={v.profilePublic ? <Button size="sm" variant="ghost" icon="chevron" onClick={() => navigate('friends')}>친구 화면</Button> : undefined}>
            <ul className="st-rows">
              {UNLOCKS.map(u => (
                <Row key={u.title} title={<><Icon name={u.icon} />{u.title}</>} sub={u.sub}>
                  <Badge tone={v.profilePublic ? 'green' : 'neutral'}>{v.profilePublic ? '열림' : '공개 필요'}</Badge>
                </Row>
              ))}
            </ul>
          </Group>
          <Group title="공개하면 보이는 것">
            <ul className="st-rows">
              {SHOWN.map(s => (
                <Row key={s.title} title={s.title} sub={s.sub}>
                  {s.shown.tone === 'lock' ? <Badge tone="dashed" icon="lock">{s.shown.text}</Badge> : <Badge tone={s.shown.tone}>{s.shown.text}</Badge>}
                </Row>
              ))}
            </ul>
          </Group>
        </div>
      </Card>

      <Card className="st-card" title="무엇을 보일지 골라요" action={<span>켜진 것만 친구에게 보여요</span>}>
        <Group title="한 활동">
          {candidates.length ? (
            <div className="st-chips">
              {candidates.map(a => <Chip key={a.id} selected={visibleIds.has(a.id)} onClick={() => set({ hiddenActivityIds: toggled(v.hiddenActivityIds, a.id) })}>{a.title}</Chip>)}
            </div>
          ) : <p className="st-empty">보일 활동이 아직 없어요. 활동을 시작하면 여기서 고를 수 있어요.</p>}
        </Group>
        <Group title="회고">
          {state.records.length ? (
            <div className="st-chips">
              {state.records.map(r => <Chip key={r.id} selected={v.sharedRecordIds.includes(r.id)} onClick={() => set({ sharedRecordIds: toggled(v.sharedRecordIds, r.id) })}>{r.title}</Chip>)}
            </div>
          ) : <p className="st-empty">공개할 회고가 아직 없어요. 활동이 끝나면 회고를 써 보세요.</p>}
        </Group>
        <Group title="전시할 도전 과제">
          {achieved.length ? (
            <div className="st-chips">
              {achieved.map(c => <Chip key={c.def.id} selected={showcased.has(c.def.id)} onClick={() => set({ showcaseChallengeIds: toggled(v.showcaseChallengeIds, c.def.id) })}>{c.def.name}</Chip>)}
            </div>
          ) : <p className="st-empty">달성한 도전 과제가 아직 없어요. 달성하면 여기서 전시할 것을 고를 수 있어요.</p>}
        </Group>
      </Card>

      <p className="st-note"><Icon name="check" />언제든 비공개로 돌릴 수 있어요. 돌리면 친구 찾기, 팀원 모집, 명예의 전당도 멈춰요.</p>

      <Modal
        open={asking}
        title="프로필을 공개할까요?"
        onClose={() => setAsking(false)}
        actions={<><Button onClick={() => setAsking(false)}>그만둘게요</Button><Button variant="primary" onClick={publish}>공개할게요</Button></>}
      >
        <p>가입 동의와는 따로 받는 동의예요. 공개하면 한 활동 목록이 친구에게 보이고, 회고와 도전 과제는 고른 것만 보여요. 발견과 역량 근거는 공개하지 않아요.</p>
      </Modal>
    </div>
  );
}
