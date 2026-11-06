import { answerReady } from './interview/answer';
import { prepareHref } from './recommend-flow/flow';
import type { TodayTarget } from './recommend-flow/summary';
import { whenOffset } from './recommend-flow/upcoming';
import { ddayText } from './text';
import type { Activity, RecordItem } from './types';

// 홈 계산. 값은 모두 센 개수다(점수·레벨 아님). 칭호는 이야기 모델(insight/story)의 정체성 문장을 쓴다.

/** 가진 것: 경험 카드(STAR 칸을 채운 기록) · 학교 확인 · 달성한 도전 과제. 기록 수는 경험 카드와 거의 같아서 뺐다 */
export type Inventory = { cards: number; school: number; challenges: number };

// 면접 답변으로 꺼낼 수 있는 기록(answerReady: STAR 칸이 하나라도 있다)을 경험 카드로 센다.
const starFilled = (r: RecordItem) => !!r.card && answerReady(r.card);

export function inventoryOf(records: RecordItem[], achieved: number): Inventory {
  return {
    cards: records.filter(starFilled).length,
    school: records.filter(r => r.verification === 'school').length,
    challenges: achieved
  };
}

/** 이번 주 = 오늘부터 6일 */
export const WEEK_DAYS = 6;

export type WeekTaskKind = 'deadline' | 'review' | 'meet';
/** when = 줄 오른쪽 짧은 때('오늘 18:00', 'D-5', '10월 11일 끝남'), label = 줄 전체의 접근성 이름(누르면 하는 일까지) */
export type WeekTask = { id: string; kind: WeekTaskKind; title: string; when: string; urgent?: boolean; label: string; target: TodayTarget };
export type WeekGroup = { kind: WeekTaskKind; tasks: WeekTask[] };

const clock = (s?: string) => /(\d{1,2}:\d{2})/.exec(s ?? '')?.[1];
const dayWord = (d: number, at?: string) => [d === 0 ? '오늘' : d === 1 ? '내일' : `${d}일 뒤`, at].filter(Boolean).join(' ');

/**
 * 오늘의 퀘스트: 이번 주 할 일을 종류별로 묶는다. 순서는 신청 마감(지나면 끝) → 회고 → 모임.
 * 묶음 머리가 할 일 이름(신청 마감, 회고 쓰기)을 한 번 말해서 줄마다 같은 버튼 글자를 되풀이하지 않는다.
 * ponytail: 모임은 일정 글이 '10.14(수) 18:30' 꼴일 때만 읽는다. 일정이 날짜 필드가 되면 바꾼다.
 */
export function weekTasks(activities: Activity[], week: number): WeekGroup[] {
  const deadline: WeekTask[] = activities
    .filter(a => a.status === 'preparing' && a.due && a.due.dday >= 0 && a.due.dday <= WEEK_DAYS)
    .sort((a, b) => a.due!.dday - b.due!.dday)
    .map(a => {
      const d = a.due!.dday;
      const when = d <= 1 ? dayWord(d, clock(a.due!.label)) : ddayText(d);
      return {
        id: `due:${a.id}`, kind: 'deadline', title: a.title, when, urgent: d <= 1, label: `${a.title} 신청 준비, ${a.due!.label} ${when}`,
        target: a.programId ? { path: prepareHref(a.programId) } : { kind: 'activity', id: a.id }
      };
    });
  const review: WeekTask[] = activities
    .filter(a => a.status === 'ended')
    .map(a => ({ id: `review:${a.id}`, kind: 'review', title: a.title, when: a.schedule, label: `${a.title} 회고 쓰기`, target: { path: `activities/records/interview/${a.id}` } }));
  const meet: WeekTask[] = activities
    .map(a => ({ a, day: whenOffset(a.schedule, week) }))
    .filter((x): x is { a: Activity; day: number } => (x.a.status === 'applied' || x.a.status === 'ongoing') && x.day !== undefined && x.day >= 0 && x.day <= WEEK_DAYS)
    .sort((x, y) => x.day - y.day)
    .map(({ a, day }) => ({ id: `meet:${a.id}`, kind: 'meet', title: a.title, when: dayWord(day, clock(a.schedule)), label: `${a.title}, ${a.schedule}`, target: { kind: 'activity', id: a.id } }));
  const groups: WeekGroup[] = [{ kind: 'deadline', tasks: deadline }, { kind: 'review', tasks: review }, { kind: 'meet', tasks: meet }];
  return groups.filter(g => g.tasks.length > 0);
}
