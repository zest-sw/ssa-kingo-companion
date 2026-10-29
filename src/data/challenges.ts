import type { IconName } from '../components';
import type { ChallengeDef } from '../domain/challenges';

// 예시 도전 과제 9개 (docs/product/concept.md '도전 과제 예시(안)'). 희귀도와 숨김 여부는 예시 값이다.

export type Rarity = 'common' | 'uncommon' | 'rare';
export const RARITY_LABEL: Record<Rarity, string> = { common: '흔함', uncommon: '드묾', rare: '희귀' };

export type ChallengeInfo = ChallengeDef & {
  name: string;
  condition: string;
  icon: IconName;
  rarity: Rarity;
  /** 숨은 과제의 힌트. 있는 것만 보인다 */
  hint?: string;
  /** 달성하면 보여 주는 한 줄: 무엇을 잘했는지 */
  praise: string;
  /** 아직 열리지 않았다는 안내 (예: 학기 끝 회고) */
  note?: string;
};

export const CHALLENGES: ChallengeInfo[] = [
  { id: 'first-retro', rule: 'firstRetro', hidden: false, name: '첫 회고', condition: '활동이 끝난 뒤 회고 쓰기', icon: 'pencil', rarity: 'common', praise: '끝난 활동을 내 말로 돌아봤어요.' },
  { id: 'three-paths', rule: 'threePaths', hidden: false, name: '세 갈래 길', condition: '서로 다른 분야 세 곳 경험하기', icon: 'compass', rarity: 'uncommon', praise: '익숙한 분야 밖으로 발을 넓혔어요.' },
  { id: 'first-places', rule: 'firstPlaces', hidden: false, name: '처음 가 보는 곳', condition: '처음 이용하는 학교 기관 프로그램 3개', icon: 'flag', rarity: 'common', praise: '낯선 곳에 먼저 가 봤어요.' },
  { id: 'explainer', rule: 'explainer', hidden: false, name: '설명하는 사람', condition: '멘토나 발표 역할 맡기', icon: 'friends', rarity: 'uncommon', praise: '아는 것을 남에게 풀어 줬어요.' },
  { id: 'semester-review', rule: 'semesterReview', hidden: false, name: '한 학기 돌아보기', condition: '학기 끝 회고 쓰기', icon: 'records', rarity: 'uncommon', praise: '한 학기를 처음부터 끝까지 되짚었어요.', note: '12월에 열려요' },
  { id: 'retry', rule: 'retry', hidden: true, name: '다시 도전', condition: '떨어진 프로그램에 다음 학기에 다시 지원하기', icon: 'refresh', rarity: 'rare', praise: '한 번 아쉬웠던 곳에 다시 손을 들었어요.' },
  { id: 'role-swap', rule: 'roleSwap', hidden: true, name: '역할 바꾸기', condition: '멘티로 참여한 프로그램에 멘토로 다시 참여하기', icon: 'sparkle', rarity: 'rare', hint: '역할을 바꿔 보세요', praise: '배우던 자리에서 가르치는 자리로 옮겼어요.' },
  { id: 'two-campus', rule: 'twoCampus', hidden: true, name: '두 캠퍼스', condition: '인문사회과학캠퍼스와 자연과학캠퍼스 프로그램에 모두 참여하기', icon: 'home', rarity: 'uncommon', praise: '두 캠퍼스를 오가며 활동했어요.' },
  { id: 'together', rule: 'together', hidden: true, name: '함께 회고', condition: '친구와 같은 활동에 참여하고 둘 다 회고 쓰기', icon: 'doc', rarity: 'rare', praise: '같은 경험을 둘이서 돌아봤어요.' }
];

export const CHALLENGE_BY_ID = Object.fromEntries(CHALLENGES.map(c => [c.id, c])) as Record<string, ChallengeInfo>;
