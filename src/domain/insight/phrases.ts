import { josa, josaRo } from '../text';
import type { Axis, FieldGroup } from '../types';

// 이야기 문장의 낱말 조각. 문장 틀은 story.ts 가 조합한다.
// 정체성 문장 틀: '<묶음이 하는 일> <강점이 하는 일> 쪽으로 자라고 있어요'.
// 앞 조각은 '~하고/~하며'로 끝나는 동사구, 뒤 조각은 '~하는'으로 끝나는 관형구라서 어떤 짝을 붙여도 조사가 어긋나지 않는다.

/** 활동 묶음이 하는 일. 키는 사전 주제 id(data/kgTaxonomy, 묶음의 topic) */
export const CLUSTER_DOING: Record<string, string> = {
  research: '사용자 이야기를 듣고',
  plan: '서비스를 그려 보며',
  data: '데이터를 읽고',
  devBasic: '기초를 다지며',
  devMake: '직접 만들어 보며',
  share: '배운 것을 나누며',
  club: '사람을 모으며',
  global: '다른 문화와 이야기하며',
  career: '진로를 살피며'
};

/** 분야 묶음이 하는 일. 묶음 id 를 모를 때(합쳐진 묶음 등) 쓴다 */
export const GROUP_DOING: Record<FieldGroup, string> = {
  plan: '서비스를 그려 보며', ai: '데이터를 읽고', dev: '직접 만들어 보며', mentor: '배운 것을 나누며', global: '다른 문화와 이야기하며', other: '진로를 살피며'
};

/** 강점(역량)이 하는 일 */
export const AXIS_DOING: Record<Axis, string> = {
  problem: '문제로 정리하는',
  communication: '생각을 말로 잇는',
  expertise: '한 분야를 깊게 파는',
  collaboration: '함께 일을 굴리는',
  self: '스스로 길을 내는',
  creative: '새 답을 만들어 내는'
};

export const identityLine = (doing: string, axisDoing: string) => `${doing} ${axisDoing} 쪽으로 자라고 있어요`;

/** '은/는', '이/가', '을/를', '으로/로' 를 붙인 낱말 */
export const eun = (w: string) => `${w}${josa(w, '은', '는')}`;
export const iga = (w: string) => `${w}${josa(w, '이', '가')}`;
export const eul = (w: string) => `${w}${josa(w, '을', '를')}`;
export const ro = (w: string) => `${w}${josaRo(w)}`;
export const wa = (w: string) => `${w}${josa(w, '과', '와')}`;
