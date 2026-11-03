import { useMemo } from 'react';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { Card, Legend, Timeline, type LegendItem, type TimelineItem } from '../../components';
import type { UpcomingItem } from '../../domain/recommend-flow/upcoming';
import { upcomingRange } from '../../domain/recommend-flow/upcoming';

const MARK = { deadline: { mark: 'diamond', tone: 'accent' }, activity: { mark: 'dot', tone: 'ai' } } as const;
const LEGEND: LegendItem[] = [{ label: '마감', mark: 'diamond', tone: 'accent' }, { label: '활동 날짜', mark: 'dot', tone: 'ai' }];

/** 곧 있어요: 모레부터 14일 타임라인(오늘·내일은 오늘 할 일 칸). 점마다 이름을 붙이고, 누르면 그 기회·활동의 서랍이 열린다. */
export function Upcoming({ items, week }: { items: UpcomingItem[]; week: number }) {
  const range = useMemo(() => upcomingRange(week), [week]);
  const points: TimelineItem[] = items.map(i => ({ id: i.id, date: i.date, label: i.label, short: i.short, group: i.group, ...MARK[i.kind] }));
  const go = (id: string) => {
    const t = items.find(i => i.id === id)?.target;
    if (!t) return;
    if ('path' in t) navigate(t.path);
    else openEntity(t);
  };
  return (
    <Card title="곧 있어요" action={<Legend items={LEGEND} />} className="home-upcoming">
      <Timeline label="모레부터 14일" labels range={range} items={points} onSelect={go} empty="모레부터 14일은 비어 있어요. 추천에서 마음에 드는 활동을 골라 보세요." />
    </Card>
  );
}
