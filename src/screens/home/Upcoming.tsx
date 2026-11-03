import { useMemo } from 'react';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { Card, Legend, Timeline, type LegendItem, type TimelineItem } from '../../components';
import type { UpcomingItem } from '../../domain/recommend-flow/upcoming';
import { upcomingRange, todayIso } from '../../domain/recommend-flow/upcoming';

const MARK = { deadline: { mark: 'diamond', tone: 'accent' }, activity: { mark: 'dot', tone: 'ai' }, review: { mark: 'ring', tone: 'mentor' } } as const;
const LEGEND: LegendItem[] = [
  { label: '마감', mark: 'diamond', tone: 'accent' }, { label: '활동 날짜', mark: 'dot', tone: 'ai' }, { label: '회고 대기', mark: 'ring', tone: 'mentor' }, { label: '오늘', mark: 'today' }
];

/** 곧 있어요: 14일 타임라인. 점을 누르면 그 기회·활동의 서랍, 회고 대기는 회고 인터뷰로 간다. */
export function Upcoming({ items, week }: { items: UpcomingItem[]; week: number }) {
  const range = useMemo(() => upcomingRange(week), [week]);
  const points: TimelineItem[] = items.map(i => ({ id: i.id, date: i.date, label: i.label, ...MARK[i.kind] }));
  const go = (id: string) => {
    const t = items.find(i => i.id === id)?.target;
    if (!t) return;
    if ('path' in t) navigate(t.path);
    else openEntity(t);
  };
  return (
    <Card title="곧 있어요" action={<Legend items={LEGEND} />} className="home-upcoming">
      <Timeline label="앞으로 14일" range={range} today={todayIso(week)} items={points} onSelect={go} empty="앞으로 14일은 비어 있어요. 추천에서 마음에 드는 활동을 골라 보세요." />
    </Card>
  );
}
