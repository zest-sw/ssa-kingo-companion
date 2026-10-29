import { useRef } from 'react';
import { Button, Card, EmptyState, PageHeader } from '../../components';
import { navigate, type ScreenProps } from '../../app/router';
import { useApp } from '../../app/AppState';
import { Archive } from './Archive';
import { Interview } from './Interview';
import { Pending } from './Pending';
import { useStoreSync } from './useStoreSync';
import { RecordsTabs } from './RecordsTabs';
import './records.css';

/** 하위 경로: (없음)·archive = 기록 보관함, interview = 회고 대기 목록, interview/<활동 id> = 그 활동의 회고 */
export default function RecordsScreen({ sub }: ScreenProps) {
  useStoreSync();
  const [head, id] = (sub ?? 'archive').split('/');
  if (head === 'interview') return id ? <Gate id={id} key={id} /> : <Pending />;
  return <Archive />;
}

/** 회고를 열 수 있는 활동인지 본다. 저장해서 '기록됨'이 된 뒤에도 완료 화면은 남아야 해서 처음 열 때만 판단한다. */
function Gate({ id }: { id: string }) {
  const { state } = useApp();
  const activity = state.activities.find(a => a.id === id);
  const startedEnded = useRef(activity?.status === 'ended').current;
  if (activity && startedEnded) return <Interview activity={activity} />;

  const message = !activity ? '찾을 수 없는 활동이에요. 회고를 기다리는 활동에서 골라 주세요.'
    : activity.status === 'recorded' ? '이 활동은 이미 기록했어요. 기록 보관함에서 볼 수 있어요.'
    : '아직 끝나지 않은 활동이에요. 끝나면 회고를 쓸 수 있어요.';
  return (
    <>
      <PageHeader eyebrow="회고" title={activity?.title ?? '회고 쓰기'} />
      <RecordsTabs value="interview">
        <Card>
          <EmptyState
            icon="records"
            message={message}
            action={activity?.status === 'recorded'
              ? <Button variant="primary" onClick={() => navigate('records/archive')}>기록 보관함 보기</Button>
              : <Button variant="primary" onClick={() => navigate(activity ? 'activities' : 'records/interview')}>{activity ? '내 활동 보기' : '회고 목록 보기'}</Button>}
          />
        </Card>
      </RecordsTabs>
    </>
  );
}
