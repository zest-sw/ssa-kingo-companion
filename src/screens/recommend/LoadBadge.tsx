import { Badge } from '../../components';
import type { WeekLoad } from '../../domain/recommend-flow/load';

/** 이번 주 내 일정에 비춘 부담. 다른 학생과 비교하지 않고, 색 없이 글자(여유/빠듯)와 까닭 한 마디로만 알린다. */
export function LoadBadge({ load }: { load: WeekLoad }) {
  return <Badge icon="calendar">{load.label} · {load.why}</Badge>;
}
