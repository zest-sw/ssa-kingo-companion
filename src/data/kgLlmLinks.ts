// 예시 학생의 LLM 엣지와 묶음 이름 후보. 실제 LLM 을 부르지 않고 미리 넣은 값이다(프로토타입).
// 회고 문장 사이의 의미 관계만 담는다(같은 분야·같은 역량처럼 규칙으로 알 수 있는 것은 규칙 엣지가 맡는다).
// 학생이 '맞아요' 하기 전까지 화면에서는 점선이다. confidence 는 0~1, 화면에 숫자로 내지 않는다.

export type LlmLinkSeed = { a: string; b: string; confidence: number; reason: string };
/** members: 이 이름을 만들 때 본 활동. 묶음과 많이 겹칠 때만 이 이름을 쓴다 */
export type LlmNameSeed = { members: string[]; name: string; summary: string };

export const KG_LLM_LINKS: LlmLinkSeed[] = [
  { a: 'r-algo', b: 'r-oss', confidence: 0.8, reason: '막힌 이유를 질문으로 바꾸던 습관이 이슈에 질문 남기기로 이어졌어요' },
  { a: 'r-py', b: 'r-algo', confidence: 0.7, reason: '막힌 줄을 모아 묻던 질문 담당이 막힌 이유를 묻는 스터디로 이어졌어요' },
  { a: 'r-mlstudy', b: 'r-algo', confidence: 0.6, reason: '이해 안 된 부분을 질문으로 모으는 방식이 같아요' },
  { a: 'r-datalec', b: 'e2', confidence: 0.75, reason: '숫자보다 질문을 먼저 정한 경험이 인터뷰 질문지로 이어졌어요' },
  { a: 'r-surveyviz', b: 'r-survey', confidence: 0.85, reason: '설문 응답을 차트로 만든 경험이 설문을 직접 설계하는 데로 이어졌어요' },
  { a: 'r-mlstudy', b: 'r-datacamp', confidence: 0.6, reason: '데이터가 어디서 왔는지 궁금해한 것이 공공데이터를 직접 다루는 데로 이어졌어요' },
  { a: 'r-buddy', b: 'e6', confidence: 0.7, reason: '낯선 사람이 학교 서비스에서 막히는 걸 본 경험이 사용성 관찰로 이어졌어요' },
  { a: 'r-globalonline', b: 'r-buddy', confidence: 0.65, reason: '나라마다 앱을 다르게 쓰는 걸 본 경험이 교환학생 안내로 이어졌어요' },
  { a: 'r-winterhack', b: 'r-aiidea', confidence: 0.6, reason: '친구들이 실제로 쓴 봇 경험이 누가 왜 쓰는지 말하는 제안으로 이어졌어요' },
  { a: 'r-planws', b: 'e1', confidence: 0.8, reason: '문제 문장을 먼저 쓰는 연습이 팀 의견을 문제 문장으로 묶는 데 쓰였어요' },
  { a: 'e1', b: 'e4', confidence: 0.75, reason: '같은 문제정의 틀을 해커톤 과업에도 썼어요' },
  { a: 'r-appclub', b: 'e5', confidence: 0.55, reason: '누가 무엇을 맡을지 정하던 경험이 역할·일정 정리로 이어졌어요' },
  { a: 'r-tutor', b: 'r-mentor', confidence: 0.8, reason: '신입 부원에게 설명한 경험이 멘토로 설명하는 데 이어졌어요' },
  { a: 'e3', b: 'e6', confidence: 0.6, reason: '답을 유도하지 않는 질문 연습이 사용성 테스트에서 묻는 방식으로 이어졌어요' }
];

export const KG_LLM_NAMES: LlmNameSeed[] = [
  { members: ['r-py', 'r-algo', 'r-oss', 'r-mlstudy'], name: '질문으로 배우기', summary: '막힌 곳을 질문으로 바꿔 배우는 활동이 모였어요' },
  { members: ['r-globalonline', 'r-buddy'], name: '낯선 사용자 돕기', summary: '다른 나라 사람이 서비스를 어떻게 쓰는지 본 활동이에요' },
  { members: ['r-tutor', 'r-mentor', 'r-mentee'], name: '설명하며 배우기', summary: '배운 것을 남에게 설명하며 다시 배운 활동이에요' }
];
