import type { ScreenProps } from '../../app/router';
import RecordsPage from '../records';
import './ActivityEntity';
import { Overview } from './Overview';
import { Schedule } from './Schedule';
import './activities.css';

/**
 * 하위 경로: (없음) = 내 활동 요약, schedule[/board|list] = 일정(타임라인·보드·목록), records = 기록, records/interview[/<활동 id>] = 회고 인터뷰.
 * 기록 화면은 screens/records 폴더에 있고 여기서 그린다. 활동 서랍은 어디서든 openEntity 로 연다.
 */
export default function ActivitiesScreen({ sub }: ScreenProps) {
  const [head, ...rest] = (sub ?? '').split('/');
  if (head === 'schedule') return <Schedule sub={rest.join('/') || undefined} />;
  if (head === 'records') return <RecordsPage sub={rest.join('/') || undefined} />;
  return <Overview />;
}
