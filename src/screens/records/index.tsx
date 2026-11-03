import { useRef } from 'react';
import { Button, Card, EmptyState, PageHeader } from '../../components';
import { navigate, parentLink } from '../../app/router';
import { useApp } from '../../app/AppState';
import './RecordEntity';
import { Interview } from './Interview';
import { Overview } from './Overview';
import { Pending } from './Pending';
import './records.css';

/**
 * 내 활동 › 기록. 메뉴가 아니라 내 활동 화면(screens/activities)이 그린다.
 * sub: (없음) = 기록 지도 + 보관함, interview = 회고 대기 목록, interview/<활동 id> = 그 활동의 회고 인터뷰(흐름 화면)
 */
export default function RecordsPage({ sub }: { sub?: string }) {
  const [head, id] = (sub ?? '').split('/');
  if (head === 'interview') return id ? <Gate id={id} key={id} /> : <Pending />;
  return <Overview />;
}

/** 회고를 열 수 있는 활동인지 본다. 저장해서 '기록됨'이 된 뒤에도 완료 화면은 남아야 해서 처음 열 때만 판단한다. */
function Gate({ id }: { id: string }) {
  const { state } = useApp();
  const activity = state.activities.find(a => a.id === id);
  const startedEnded = useRef(activity?.status === 'ended').current;
  if (activity && startedEnded) return <Interview activity={activity} />;

  // 기록으로 돌아가는 길은 빵부스러기가 맡는다. 여기 버튼은 다른 곳으로만 보낸다.
  const message = !activity ? '찾을 수 없는 활동이에요. 회고를 기다리는 활동에서 골라 주세요.'
    : activity.status === 'recorded' ? '이 활동은 이미 기록했어요. 위의 기록에서 볼 수 있어요.'
    : '아직 끝나지 않은 활동이에요. 끝나면 회고를 쓸 수 있어요.';
  const action = !activity ? <Button variant="primary" onClick={() => navigate('activities/records/interview')}>회고 목록 보기</Button>
    : activity.status === 'recorded' ? undefined
    : <Button variant="primary" onClick={() => navigate('activities/schedule')}>일정 보기</Button>;
  return (
    <div className="os">
      <PageHeader parent={parentLink('activities/records')} crumb="회고 인터뷰" title={activity?.title ?? '회고 쓰기'} />
      <Card className="rec-empty"><EmptyState icon="records" message={message} action={action} /></Card>
    </div>
  );
}
