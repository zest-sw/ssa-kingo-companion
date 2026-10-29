import type { ActivityStatus, Axis, DiscState, Did, Energy, Field, FieldGroup, ReasonKind } from './types';

// 규칙과 문장 생성이 함께 쓰는 이름표. v0.7 App.tsx 에서 옮겼다.

export const DID_LIST: { id: Did; label: string }[] = [
  { id: 'listen', label: '듣고 정리하기' }, { id: 'ask', label: '질문하기' }, { id: 'organize', label: '의견 묶고 조율하기' },
  { id: 'make', label: '직접 만들기' }, { id: 'idea', label: '아이디어 내기' }, { id: 'present', label: '설명·발표하기' }
];
export const DID_LABEL = Object.fromEntries(DID_LIST.map(d => [d.id, d.label])) as Record<Did, string>;

export const ENERGY: { id: Energy; label: string; sub: string }[] = [
  { id: 'up', label: '더 생겼어요', sub: '또 해 보고 싶어요' }, { id: 'same', label: '그대로예요', sub: '괜찮았어요' }, { id: 'down', label: '좀 지쳤어요', sub: '다음엔 짧게 할래요' }
];
export const ENERGY_SENTENCE: Record<Energy, string> = { up: '끝난 뒤 에너지가 더 생겼다', same: '에너지는 평소와 비슷했다', down: '끝난 뒤 조금 지쳤다' };

export const FIELD_LABEL: Record<Field, string> = {
  research: 'UX·리서치', product: '서비스 기획', data: '데이터', ai: 'AI', dev: '개발', career: '진로·취업 준비',
  startup: '창업', mentor: '멘토링', global: '글로벌', club: '동아리·봉사', etc: '기타'
};

// ponytail: 세부 분야를 색 묶음 5개(+기타)로 접는 기준은 임시다. 테크 트리 분야 기준이 정해지면 고친다.
export const FIELD_GROUP: Record<Field, FieldGroup> = {
  dev: 'dev', data: 'ai', ai: 'ai', product: 'plan', startup: 'plan', research: 'plan',
  mentor: 'mentor', club: 'mentor', global: 'global', career: 'other', etc: 'other'
};
export const GROUP_LABEL: Record<FieldGroup, string> = { dev: '개발', ai: 'AI·데이터', plan: '창업·기획', mentor: '멘토링', global: '글로벌', other: '기타' };

export const UP_STATEMENT: Record<Did, string> = {
  listen: '사람 이야기를 듣고 정리할 때 에너지가 올라가요', ask: '질문을 바꿔 가며 답을 찾을 때 에너지가 올라가요', organize: '의견을 묶고 조율할 때 에너지가 올라가요',
  make: '직접 만들어 볼 때 에너지가 올라가요', idea: '아이디어를 낼 때 에너지가 올라가요', present: '설명하고 발표할 때 에너지가 올라가요'
};
export const FREQ_STATEMENT: Record<Did, string> = {
  listen: '듣고 정리하는 역할을 자주 맡아요', ask: '질문을 만드는 역할을 자주 맡아요', organize: '흩어진 의견을 묶는 역할을 자주 맡아요',
  make: '직접 만드는 역할을 자주 맡아요', idea: '아이디어를 내는 역할을 자주 맡아요', present: '설명·발표 역할을 자주 맡아요'
};
export const DID_AXES: Record<Did, Axis[]> = {
  listen: ['communication', 'expertise'], ask: ['problem', 'communication'], organize: ['collaboration', 'communication'],
  make: ['creative', 'problem'], idea: ['creative', 'self'], present: ['communication', 'self']
};
export const AXES: { id: Axis; label: string }[] = [
  { id: 'expertise', label: '전문성' }, { id: 'problem', label: '문제해결' }, { id: 'communication', label: '소통' },
  { id: 'collaboration', label: '협업' }, { id: 'self', label: '자기주도' }, { id: 'creative', label: '창의성' }
];

export const TIME_OPTIONS = [
  { value: 1.5, label: '1시간 안팎', sub: '짧은 특강·상담 위주' }, { value: 3, label: '2~3시간', sub: '워크숍 한 번 정도' }, { value: 8, label: '반나절도 괜찮아요', sub: '해커톤·현장 활동까지' }
];

export const REASON_LABEL: Record<ReasonKind, string> = { energy: '내 기록', focus: '확인한 발견', career: '진로', novelty: '탐색', interest: '관심', bridge: '지난주 반영' };
export const DISC_STATE_TEXT: Record<DiscState, string> = {
  none: '아직 확인 전이에요', yes: '맞다고 했어요 · 추천에 반영 중', no: '아니라고 했어요 · 추천에 쓰지 않아요', changed: '근거가 바뀌었어요 · 다시 확인해 주세요'
};

// ponytail: 보드 상태 이름은 기준 문서에서 미정이다. 정해지면 이 표만 고친다.
export const STATUS_LABEL: Record<ActivityStatus, string> = {
  preparing: '신청 준비', applied: '결과 대기', ongoing: '진행 중', ended: '회고 대기', recorded: '기록됨', declined: '이번엔 안 됨'
};
