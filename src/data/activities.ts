import { PROGRAM_BY_ID } from './catalog';
import type { Activity } from '../domain/types';

// 내 활동 예시의 부가 정보. 회고 인터뷰가 '상황'을 먼저 채우고, 기록 카드의 기본 정보를 만드는 데 쓴다. 실제 데이터가 아니다.

export type ActivityFacts = {
  /** 활동 유형. 기록 카드 기본 정보에 들어간다 */
  kind: string;
  /** 학교 연동으로 확인된 활동인지(예시). false 면 '직접 입력' */
  verified: boolean;
  /** 에이전트가 활동 정보로 미리 채우는 상황. 없으면 인터뷰에서 묻는다 */
  situation?: string;
};

const FACTS: Record<string, ActivityFacts> = {
  'a-hackathon': { kind: '교내 해커톤', verified: true, situation: '24시간 교내 해커톤, 4인 팀' },
  'a-ai-club': { kind: '학회', verified: false },
  'a-startup-club': { kind: '동아리', verified: false }
};

/** 활동 정보. 기회 DB 에 있는 활동은 장소·일정으로 상황을 만든다. 모르면 상황은 비워 둔다. */
export function factsOf(a: Activity): ActivityFacts {
  const known = FACTS[a.id];
  if (known) return known;
  const p = a.programId ? PROGRAM_BY_ID[a.programId] : undefined;
  if (p) return { kind: '비교과 프로그램', verified: true, situation: `${p.host.replace(' (예시)', '')} ${p.durationLabel} 프로그램, ${p.place.replace(' (예시)', '')}` };
  return { kind: '비교과 활동', verified: false };
}
