import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { Badge, Button, Card, Chip } from '../../components';
import { FORMAT_OPTIONS, INTEREST_OPTIONS } from '../../data/options';
import { toggleInterest } from '../../domain/recommend-flow/flow';
import type { Interest, Profile } from '../../domain/types';
import { TIME_OPTIONS } from '../../domain/vocab';
import { Group } from './Row';

const same = (a: Profile, b: Profile) =>
  a.time === b.time && a.format === b.format && a.goal.trim() === b.goal.trim() && a.interests.length === b.interests.length && a.interests.every(i => b.interests.includes(i));

/** 추천 조건. 추천 화면의 '관심 분야·시간 바꾸기'도 여기로 온다. 저장하면 바로 다시 고른다. */
export function ProfileSection() {
  const { state, run } = useApp();
  const [draft, setDraft] = useState(state.profile);
  const [saved, setSaved] = useState(false);
  const dirty = !same(draft, state.profile);
  const edit = (patch: (d: Profile) => Partial<Profile>) => { setDraft(d => ({ ...d, ...patch(d) })); setSaved(false); };
  const toggle = (id: Interest) => edit(d => ({ interests: toggleInterest(d.interests, id) }));

  const save = () => {
    run({ type: 'profile/save', profile: { ...draft, goal: draft.goal.trim() } }, { toast: '저장했어요. 바뀐 조건으로 추천을 다시 골랐어요.' });
    setSaved(true);
  };

  return (
    <Card className="st-card">
      <Group title="관심 분야" sub="추천 후보를 고를 때 가장 먼저 봐요" action={<Badge>최대 3개</Badge>}>
        <div className="st-chips">
          {INTEREST_OPTIONS.map(o => <Chip key={o.id} selected={draft.interests.includes(o.id)} onClick={() => toggle(o.id)}>{o.label}</Chip>)}
        </div>
      </Group>
      <Group title="한 주에 쓸 시간" sub="이보다 오래 걸리는 활동은 뒤로 미뤄요">
        <div className="st-chips">
          {TIME_OPTIONS.map(o => <Chip key={o.value} selected={draft.time === o.value} onClick={() => edit(() => ({ time: o.value }))}>{o.label}</Chip>)}
        </div>
      </Group>
      <Group title="방식">
        <div className="st-chips">
          {FORMAT_OPTIONS.map(o => <Chip key={o.value} selected={draft.format === o.value} onClick={() => edit(() => ({ format: o.value }))} title={o.sub}>{o.label}</Chip>)}
        </div>
      </Group>
      <Group title="목표" sub="신청서 초안의 지원 동기에 써요. 비워 둬도 돼요">
        <label className="st-field">
          <span className="sr-only">목표</span>
          <input className="st-input" value={draft.goal} maxLength={40} placeholder="예: 서비스 기획 직무" onChange={e => { const goal = e.target.value; edit(() => ({ goal })); }} />
        </label>
      </Group>
      <div className="st-foot">
        <p className="st-foot__note" aria-live="polite">{dirty ? '바꾼 내용이 아직 저장되지 않았어요' : saved ? '저장했어요. 추천에 반영됐어요' : '지금 추천은 이 조건으로 골랐어요'}</p>
        {saved && !dirty && <Button variant="ghost" icon="compass" onClick={() => navigate('recommend')}>추천 보기</Button>}
        {dirty && <Button variant="ghost" onClick={() => setDraft(state.profile)}>되돌리기</Button>}
        <Button variant="primary" disabled={!dirty} onClick={save}>저장하고 다시 고르기</Button>
      </div>
    </Card>
  );
}
