import { discoveriesOf } from '../domain/discoveries';
import type { Activity, Confirm, Profile, RecordItem, Visibility } from '../domain/types';

// 예시 학생(가상 인물). 실제 학생 데이터가 아니다. 인물 설명은 docs/product/example-student.md.
// 소프트웨어학과 3학년: 1학년엔 개발로 시작 → 2학년에 데이터·AI 로 넓힘 → 3학년에 서비스 기획·리서치로 좁혀 간다. 멘토링·글로벌은 조금.

export const EMPTY_PROFILE: Profile = { interests: [], time: 3, format: 'any', goal: '', importCS: false };
export const EXAMPLE_PROFILE: Profile = { interests: ['plan'], time: 3, format: 'any', goal: '서비스 기획 직무', importCS: false };

type Base = Pick<RecordItem, 'v' | 'source' | 'visibility' | 'useForRecommend'>;
const B: Base = { v: 1, source: 'agent', visibility: 'me', useForRecommend: true };

/**
 * 3년 동안 남긴 회고 25개. 학기 순서로 둔다. card 는 STAR(상황·역할·결과)와 다음에 해 볼 것, 한 일·배운 점은 note·quote 가 채운다(cardOf).
 * level 은 심화 수준(1 입문 · 2 중급 · 3 심화). 글로벌은 온라인 교류(입문)에서 중급 없이 교환학생 도우미(심화)로 건너뛰었다.
 */
export const SEED_RECORDS: RecordItem[] = [
  // 2024-1 · 1학년 1학기: 개발 시작, 멘토링 멘티
  { ...B, id: 'r-py', title: '파이썬 기초 스터디', kind: '스터디', date: '1학기 · 4월', semester: '2024-1', field: 'dev', did: 'listen', level: 1, energy: 'same', quote: '따라 치기만 해서는 내 코드가 아니었다.', note: '매주 예제를 따라 치고 막힌 줄을 스터디원에게 물었다.', axes: ['expertise', 'self'], confirmedAxes: ['self'], verification: 'self', card: { situation: '1학년 1학기에 여섯 명이 모여 8주 동안 한 파이썬 스터디였다.', role: '매주 막힌 줄을 모아 오는 질문 담당을 맡았다.', result: '8주 동안 한 번도 안 빠졌고, 마지막 주에 계산기 프로그램을 혼자 끝까지 짰다.', next: '예제 없이 작은 프로그램을 처음부터 짜 보고 싶다.' } },
  { ...B, id: 'r-mentee', title: 'SW 학습 멘토링 · 멘티', kind: '멘토링', date: '1학기 · 5월', semester: '2024-1', field: 'mentor', did: 'listen', level: 1, energy: 'same', quote: '선배가 어디서 막혔는지 먼저 물어봐 줘서 편했다.', note: '멘티로 참여해 과제 코드 리뷰를 받고 질문 목록을 정리했다.', axes: ['communication', 'self'], confirmedAxes: ['communication', 'self'], verification: 'school', card: { situation: '첫 전공 과제를 하던 1학년 1학기, 학교 SW 학습 멘토링에 지원했다.', role: '멘티로 참여해 매주 과제 코드를 들고 갔다.', result: '한 학기 동안 과제 다섯 개를 기한 안에 냈고, 질문 목록이 열두 개 쌓였다.', next: '나중엔 내가 신입생에게 먼저 물어봐 주는 쪽이 되고 싶다.' } },
  // 2024-여름
  { ...B, id: 'r-webcamp', title: '웹 개발 입문 캠프', kind: '캠프', date: '여름 · 7월', semester: '2024-여름', field: 'dev', did: 'make', level: 1, energy: 'up', quote: '화면이 움직이는 순간 처음으로 재미있었다.', note: '할 일 목록 웹 페이지를 혼자 만들어 마지막 날 시연했다.', axes: ['expertise', 'creative', 'problem'], confirmedAxes: ['expertise', 'creative'], verification: 'school', card: { situation: '여름방학 5일짜리 웹 개발 입문 캠프였다.', role: '혼자 할 일 목록 페이지를 처음부터 만드는 개인 과제를 맡았다.', result: '마지막 날 서른 명 앞에서 시연했고, 추가·삭제 기능이 끝까지 돌아갔다.', next: '혼자 말고 팀으로 앱을 만들어 보고 싶다.' } },
  // 2024-2
  { ...B, id: 'r-appclub', title: '앱 개발 동아리 프로젝트', kind: '동아리', date: '2학기 · 10월', semester: '2024-2', field: 'dev', did: 'make', level: 2, energy: 'same', quote: '기능보다 누가 무엇을 만들지 정하는 게 더 오래 걸렸다.', note: '네 명이 동아리 출석 앱을 만들며 화면 두 개를 맡았다.', axes: ['expertise', 'collaboration', 'problem'], confirmedAxes: ['collaboration', 'problem'], verification: 'self', card: { situation: '앱 동아리에서 네 명이 한 학기 동안 출석 앱을 만들었다.', role: '로그인 화면과 출석 체크 화면, 두 화면의 개발을 맡았다.', result: '학기 말 동아리 모임 세 번을 이 앱으로 출석 체크했다.', next: '처음 모일 때 역할부터 나누는 회의를 해 보고 싶다.' } },
  { ...B, id: 'r-algo', title: '알고리즘 스터디', kind: '스터디', date: '2학기 · 11월', semester: '2024-2', field: 'dev', did: 'ask', level: 1, energy: 'same', quote: '풀이보다 왜 막혔는지 묻는 시간이 더 도움이 됐다.', note: '매주 문제 두 개를 풀고 막힌 이유를 질문으로 바꿔 공유했다.', axes: ['problem', 'self', 'expertise'], confirmedAxes: ['problem', 'expertise'], rejectedAxes: ['self'], verification: 'self', card: { situation: '학과 친구 다섯 명과 매주 모인 알고리즘 스터디였다.', role: '막힌 이유를 질문 한 줄로 바꿔 공유 문서에 올리는 정리 담당이었다.', result: '두 달 동안 문제 서른 개 정도를 풀었고, 질문 문서는 스터디원 모두가 다시 보는 자료가 됐다.', next: '풀이를 말로 설명하는 연습을 더 해 보고 싶다.' } },
  { ...B, id: 'r-oss', title: '오픈소스 첫 기여 챌린지', kind: '비교과', date: '2학기 · 12월', semester: '2024-2', field: 'dev', did: 'ask', level: 2, energy: 'same', quote: '이슈에 질문을 남기는 것부터 용기가 필요했다.', note: '문서 오타 이슈를 골라 질문을 남기고 수정 요청을 하나 보냈다.', axes: ['problem', 'communication'], rejectedAxes: ['communication'], verification: 'school', card: { situation: '학교 비교과로 열린 오픈소스 첫 기여 챌린지에 참여했다.', role: '처음 기여하는 사람으로 문서 오타 이슈 하나를 골랐다.', result: '수정 요청 하나가 받아들여져 내 이름이 기여자 목록에 올라갔다.', next: '문서 말고 작은 코드 이슈에도 도전해 보고 싶다.' } },
  // 2024-겨울
  { ...B, id: 'r-winterhack', title: '겨울 해커톤 · 학식 알림 봇', kind: '해커톤', date: '겨울 · 1월', semester: '2024-겨울', field: 'dev', did: 'make', level: 2, energy: 'up', quote: '친구들이 실제로 써 주니 밤샌 게 아깝지 않았다.', note: '학식 메뉴를 알려 주는 메신저 봇을 만들고 팀 발표 자료를 정리했다.', axes: ['collaboration', 'problem', 'creative'], confirmedAxes: ['problem', 'collaboration', 'creative'], verification: 'school', card: { situation: '겨울방학 24시간 교내 해커톤에 네 명이 한 팀으로 나갔다.', role: '봇이 메뉴를 답하는 기능 개발을 맡았다.', result: '대회 뒤 2주 동안 친구 마흔 명 정도가 실제로 봇을 썼다.', next: '사람들이 실제로 쓰는 걸 오래 지켜보면서 고쳐 보고 싶다.' } },
  // 2025-1 · 2학년: 데이터·AI 로 넓힘
  { ...B, id: 'r-datalec', title: '데이터 분석 입문 특강', kind: '특강', date: '1학기 · 3월', semester: '2025-1', field: 'data', did: 'listen', level: 1, energy: 'same', quote: '숫자를 보기 전에 질문을 먼저 정하라는 말이 남았다.', note: '특강을 듣고 학교 공개 데이터로 질문 세 개를 적어 봤다.', axes: ['expertise', 'communication'], confirmedAxes: ['expertise', 'communication'], verification: 'school', card: { situation: '2학년 1학기에 들은 두 시간짜리 데이터 분석 입문 특강이었다.', role: '수강생으로 듣고, 특강 뒤 혼자 해 보는 과제를 골랐다.', result: '학교 공개 데이터로 질문 세 개를 적었고, 그중 하나는 엑셀 차트로 답을 찾았다.', next: '질문 하나를 정해서 끝까지 분석해 보는 스터디를 찾아보고 싶다.' } },
  { ...B, id: 'r-mlstudy', title: '머신러닝 스터디', kind: '스터디', date: '1학기 · 4월', semester: '2025-1', field: 'ai', did: 'ask', level: 1, energy: 'same', quote: '모델 점수보다 데이터가 어디서 왔는지가 더 궁금했다.', note: '교재 한 장씩 맡아 정리하고 이해 안 된 부분을 질문으로 모았다.', axes: ['expertise', 'problem', 'self'], confirmedAxes: ['expertise', 'problem'], verification: 'self', card: { situation: '같은 학년 네 명이 교재 한 권을 나눠 읽은 머신러닝 스터디였다.', role: '데이터 준비 장을 맡아 정리하고 발표했다.', result: '한 학기에 교재 여덟 장을 끝냈고, 모은 질문 스무 개를 조교님께 한 번에 물었다.', next: '데이터를 직접 모으고 다듬는 프로젝트를 해 보고 싶다.' } },
  { ...B, id: 'r-tutor', title: '앱 동아리 신입 튜터', kind: '동아리', date: '1학기 · 5월', semester: '2025-1', field: 'dev', did: 'present', level: 3, energy: 'up', quote: '설명하다 보니 내가 모르던 부분이 드러났다.', note: '신입 부원 다섯 명에게 화면 만드는 법을 세 번 나눠 설명했다.', axes: ['communication', 'self'], confirmedAxes: ['communication', 'self'], verification: 'self', card: { situation: '앱 동아리에 신입 부원 다섯 명이 들어온 2학년 1학기였다.', role: '신입 튜터를 맡아 화면 만드는 법을 가르쳤다.', result: '세 번의 수업 뒤 다섯 명 모두 첫 화면을 혼자 완성했다.', next: '설명할 내용을 미리 짧은 자료로 만들어 보고 싶다.' } },
  // 2025-여름
  { ...B, id: 'r-datacamp', title: '공공데이터 분석 캠프', kind: '캠프', date: '여름 · 7월', semester: '2025-여름', field: 'data', did: 'make', level: 2, energy: 'up', quote: '지도 위에 점을 찍자 팀원들이 같은 걸 보기 시작했다.', note: '버스 정류장 이용 데이터를 지도 한 장으로 그려 개선 지점을 짚었다.', axes: ['problem', 'creative', 'expertise'], confirmedAxes: ['problem', 'expertise'], verification: 'school', card: { situation: '여름방학 3주 동안 다섯 명이 한 팀이 된 공공데이터 분석 캠프였다.', role: '데이터 정리와 지도 시각화를 맡았다.', result: '이용이 몰리는 정류장 세 곳을 짚었고, 우리 팀이 우수 팀 세 팀 안에 들었다.', next: '분석 결과를 실제 사용자에게 보여 주고 반응을 들어 보고 싶다.' } },
  { ...B, id: 'r-globalonline', title: '해외 대학 온라인 교류 수업', kind: '비교과', date: '여름 · 8월', semester: '2025-여름', field: 'global', did: 'listen', level: 1, energy: 'same', quote: '같은 앱을 나라마다 다르게 쓰는 게 신기했다.', note: '다른 나라 학생들과 자주 쓰는 앱 이야기를 나누고 차이를 표로 정리했다.', axes: ['communication', 'self'], confirmedAxes: ['communication'], rejectedAxes: ['self'], verification: 'school', card: { situation: '여름에 해외 대학 학생들과 4주 동안 화상으로 만난 교류 수업이었다.', role: '우리 조 토론 내용을 표로 정리하는 기록 담당이었다.', result: '네 나라 학생들이 자주 쓰는 앱 차이를 표 한 장으로 만들어 마지막 시간에 공유했다.', next: '교환학생처럼 직접 만나는 교류 활동에도 지원해 보고 싶다.' } },
  // 2025-2
  { ...B, id: 'r-aiidea', title: 'AI 서비스 아이디어 경진대회', kind: '대회', date: '2학기 · 10월', semester: '2025-2', field: 'ai', did: 'idea', level: 2, energy: 'up', quote: '기술보다 누가 왜 쓰는지 말할 때 심사위원이 고개를 들었다.', note: '강의 요약 챗봇 아이디어를 내고 사용 장면 세 컷을 그려 제안했다.', axes: ['creative', 'self', 'problem'], confirmedAxes: ['creative', 'problem'], verification: 'school', card: { situation: '학교에서 열린 AI 서비스 아이디어 경진대회에 두 명이 한 팀으로 나갔다.', role: '아이디어 기획과 사용 장면 그림을 맡았다.', result: '본선 열 팀 안에 들어 5분 발표를 했다.', next: '아이디어를 내기 전에 쓸 사람을 먼저 만나 보고 싶다.' } },
  { ...B, id: 'r-surveyviz', title: '설문 데이터 시각화 프로젝트', kind: '프로젝트', date: '2학기 · 11월', semester: '2025-2', field: 'data', did: 'make', level: 2, energy: 'same', quote: '차트를 고를 때마다 누가 볼지를 먼저 떠올렸다.', note: '학과 설문 응답을 차트 네 장으로 만들어 학생회에 넘겼다.', axes: ['creative', 'problem'], confirmedAxes: ['creative', 'problem'], verification: 'self', card: { situation: '학생회가 모은 학과 설문 응답 이백여 건을 정리하는 프로젝트였다.', role: '응답 정리와 차트 제작을 혼자 맡았다.', result: '차트 네 장이 학생회 게시글에 그대로 실렸다.', next: '차트를 넘기기 전에 볼 사람에게 먼저 보여 주고 싶다.' } },
  { ...B, id: 'r-mentor', title: 'SW 학습 멘토링 · 멘토', kind: '멘토링', date: '2학기 · 11월', semester: '2025-2', field: 'mentor', did: 'present', level: 3, energy: 'up', quote: '1학년 때 내가 듣고 싶던 말을 해 줄 수 있었다.', note: '멘토로 신입생 세 명의 과제 질문을 받고 매주 풀이를 설명했다.', axes: ['communication', 'self', 'collaboration'], confirmedAxes: ['communication', 'self', 'collaboration'], verification: 'school', card: { situation: '멘티로 참여했던 SW 학습 멘토링에 2학년 2학기에 멘토로 다시 지원했다.', role: '멘토를 맡아 신입생 세 명을 매주 만났다.', result: '한 학기 동안 만남 열두 번을 이어 갔고, 세 명 모두 과제를 기한 안에 냈다.', next: '멘티가 먼저 질문을 꺼내게 만드는 방법을 배워 보고 싶다.' } },
  // 2026-1 · 3학년: 서비스 기획·리서치로 좁혀 감
  { ...B, id: 'e1', title: '팀 서비스 개선안', kind: '교과', date: '1학기 · 3월', semester: '2026-1', field: 'product', did: 'organize', level: 2, energy: 'same', quote: '의견을 한 문장으로 묶으니 다음 행동이 보였다.', note: '서로 다른 팀원 의견을 불편 상황과 원인으로 나누어 문제 문장을 정리했다.', axes: ['problem', 'communication', 'collaboration'], confirmedAxes: ['collaboration', 'problem'], verification: 'self', card: { situation: '3학년 1학기 전공 수업의 다섯 명 팀 과제였다.', role: '팀원 의견을 모아 문제 문장으로 정리하는 역할을 맡았다.', result: '팀 의견이 문제 문장 두 개로 좁혀졌고, 그 문장으로 개선안을 냈다.', next: '의견을 모을 때 사용자 목소리도 같이 넣어 보고 싶다.' } },
  { ...B, id: 'r-planws', title: '서비스 기획 입문 워크숍', kind: '워크숍', date: '1학기 · 4월', semester: '2026-1', field: 'product', did: 'idea', level: 1, energy: 'down', quote: '아이디어보다 문제 문장을 먼저 쓰라는 게 어려웠다.', note: '학교 앱 불편 하나를 골라 문제 문장과 해결 아이디어 두 개를 냈다.', axes: ['creative', 'self'], confirmedAxes: ['self'], verification: 'school', card: { situation: '학교 비교과로 열린 이틀짜리 서비스 기획 입문 워크숍이었다.', role: '참가자로 학교 앱 불편 하나를 골라 혼자 과제를 했다.', result: '문제 문장을 세 번 고쳐 썼고, 해결 아이디어 두 개로 마지막 발표를 했다.', next: '문제 문장을 쓰기 전에 사용자를 먼저 만나 보고 싶다.' } },
  { ...B, id: 'e2', title: '사용자 인터뷰 과제', kind: '프로젝트', date: '1학기 · 5월', semester: '2026-1', field: 'research', did: 'listen', level: 1, energy: 'up', quote: '왜 그렇게 했는지 다시 물어보니 내 가정이 달라졌다.', note: '질문지를 만들고 답변에서 반복되는 표현을 표시했다.', axes: ['expertise', 'communication', 'problem'], confirmedAxes: ['communication', 'problem'], verification: 'self', card: { situation: '전공 수업에서 학생 다섯 명을 인터뷰하는 개인 과제였다.', role: '질문지 작성부터 인터뷰와 정리까지 혼자 했다.', result: '다섯 명 중 네 명이 같은 불편을 말한다는 걸 찾았다.', next: '답을 유도하지 않는 질문을 더 배우고 싶다.' } },
  // 2026-여름
  { ...B, id: 'e3', title: '리서치 스터디', kind: '비교과', date: '여름 · 7월', semester: '2026-여름', field: 'research', did: 'ask', level: 1, energy: 'same', quote: '좋은 질문은 답을 유도하지 않고 상황을 떠올리게 했다.', note: '서비스 리서치 사례를 읽고 답을 유도하지 않는 질문 예시를 모았다.', axes: ['expertise', 'self', 'communication'], verification: 'self', card: { situation: '여름방학 6주 동안 여섯 명이 모인 서비스 리서치 스터디였다.', role: '매주 사례 하나를 읽고 질문 예시를 모으는 정리 담당이었다.', result: '좋은 질문과 피해야 할 질문 예시를 서른 개쯤 모았다.', next: '모은 질문을 실제 설문이나 인터뷰에 써 보고 싶다.' } },
  { ...B, id: 'r-survey', title: '학생 식당 앱 이용 설문', kind: '프로젝트', date: '여름 · 8월', semester: '2026-여름', field: 'research', did: 'ask', level: 2, energy: 'same', quote: '질문 순서만 바꿔도 답이 달라졌다.', note: '질문 여섯 개짜리 설문을 두 번 고쳐 돌리고 응답을 불편 유형별로 묶었다.', axes: ['problem', 'communication', 'expertise'], confirmedAxes: ['problem', 'communication', 'expertise'], verification: 'school', card: { situation: '여름에 학생 식당 앱이 왜 불편한지 알아보려고 설문을 만들었다.', role: '설문 설계와 응답 정리를 맡았다.', result: '두 번째 설문에서 응답이 백이십 개 모였고, 불편이 세 가지로 묶였다.', next: '설문으로 찾은 불편을 사용성 테스트로 확인해 보고 싶다.' } },
  { ...B, id: 'r-buddy', title: '글로벌 버디 · 교환학생 도우미', kind: '비교과', date: '여름 · 8월', semester: '2026-여름', field: 'global', did: 'organize', level: 3, energy: 'same', quote: '내가 당연하게 쓰던 학교 서비스가 낯선 사람에겐 미로였다.', note: '교환학생 두 명의 수강 신청과 학생증 발급 순서를 정리해 안내했다.', axes: ['collaboration', 'communication'], confirmedAxes: ['collaboration', 'communication'], verification: 'school', card: { situation: '여름방학 동안 교환학생 두 명을 돕는 글로벌 버디 활동이었다.', role: '학교생활 안내를 맡은 버디였다.', result: '두 명 모두 개강 전에 수강 신청과 학생증 발급을 마쳤다.', next: '안내하면서 막혔던 곳을 정리해 학교 서비스 개선안으로 내 보고 싶다.' } },
  // 2026-2 · 지금 학기
  { ...B, id: 'e4', title: '교내 디자인 해커톤', kind: '프로젝트', date: '2학기 · 9월', semester: '2026-2', field: 'product', did: 'make', level: 2, energy: 'up', quote: '같은 문제정의 틀을 다른 과업에서도 쓸 수 있었다.', note: '두 가지 해결안을 비교하고 클릭형 화면 초안을 만들었다.', axes: ['problem', 'creative', 'collaboration'], confirmedAxes: ['creative'], verification: 'school', card: { situation: '9월에 열린 이틀짜리 교내 디자인 해커톤에 세 명이 한 팀으로 나갔다.', role: '문제 정의와 화면 초안 제작을 맡았다.', result: '심사에서 문제 정의가 가장 분명한 팀이라는 말을 들었다.', next: '화면 초안을 실제 사용자 다섯 명에게 보여 주고 싶다.' } },
  { ...B, id: 'e5', title: '동아리 캠페인 기획', kind: '비교과', date: '2학기 · 9월', semester: '2026-2', field: 'club', did: 'organize', level: 2, energy: 'same', quote: '누가 무엇을 맡는지 정리하니 다시 이야기할 여유가 생겼다.', note: '팀원과 참여자의 의견을 묶고 역할·공유 일정을 정리했다.', axes: ['communication', 'collaboration', 'creative'], verification: 'self', source: 'manual', card: { situation: '동아리에서 신입 회원 모집 캠페인을 3주 동안 준비했다.', role: '역할과 일정 정리를 맡았다.', result: '캠페인 기간에 신입 지원서가 열다섯 장 들어왔다.', next: '캠페인이 끝난 뒤 참여자 의견을 짧게 받아 보고 싶다.' } },
  { ...B, id: 'e6', title: '서비스 사용성 테스트', kind: '프로젝트', date: '2학기 · 10월', semester: '2026-2', field: 'research', did: 'listen', level: 2, energy: 'up', quote: '내 설명보다 사용자가 실제로 멈춘 지점이 중요한 근거였다.', note: '사용 과정을 관찰하고 막힌 지점을 물었다.', axes: ['expertise', 'problem', 'self'], verification: 'school', card: { situation: '서비스 리서치 크루에서 학교 앱을 처음 쓰는 학생 다섯 명을 관찰했다.', role: '진행자로 과업 네 개를 차례로 안내했다.' } },
  { ...B, id: 'r-studytalk', title: '리서치 스터디 결과 발표', kind: '발표', date: '2학기 · 10월', semester: '2026-2', field: 'research', did: 'present', level: 3, energy: 'up', quote: '발표 뒤에 받은 질문이 다음 인터뷰 질문이 됐다.', note: '여름 스터디에서 모은 질문 예시를 10분 동안 발표하고 질문을 받았다.', axes: ['communication', 'self'], confirmedAxes: ['communication'], verification: 'self', source: 'manual', card: { situation: '여름 리서치 스터디를 마치고 크루 모임에서 결과를 나눴다.', role: '스터디 대표로 발표를 맡았다.', result: '질문이 여덟 개 나왔고, 그중 세 개를 다음 인터뷰 질문지에 넣었다.' } }
];

/** 내 활동 보드 예시 13건. 오늘(2026-10-13) 기준 마감 D-0 ~ D-17 */
export const SEED_ACTIVITIES: Activity[] = [
  { id: 'a-tutor', title: 'SW 튜터 모집', field: 'mentor', status: 'preparing', schedule: '11월부터 매주 1회', prep: { done: 0, total: 1 }, due: { label: '사전 설문 마감 18:00', dday: 0 } },
  { id: 'a-swm', title: 'SW 인재 연수 과정 모집', field: 'dev', status: 'preparing', schedule: '연수 2027년 1월부터', prep: { done: 2, total: 3 }, due: { label: '신청 마감', dday: 5 } },
  { id: 'a-pm-camp', title: '서비스 기획 실무 부트캠프', field: 'product', status: 'preparing', schedule: '11월 9일 ~ 12월 4일 · 주 2회', prep: { done: 1, total: 3 }, due: { label: '신청 마감', dday: 12 } },
  { id: 'a-ux-contest', title: '교내 UX 개선 공모전', field: 'research', status: 'applied', schedule: '결과 발표 11월 6일', due: { label: '기획서 제출', dday: 9 } },
  { id: 'a-global-camp', title: '글로벌 리더십 캠프', field: 'global', status: 'applied', schedule: '결과 발표 10월 30일' },
  { id: 'a-research-crew', title: '서비스 리서치 크루', field: 'research', status: 'ongoing', schedule: '9월 15일 ~ 11월 28일 · 매주 화' },
  { id: 'a-ai-club', title: 'AI 프로젝트 학회', field: 'ai', status: 'ongoing', schedule: '9월 4일 ~ 12월 10일 · 매주 목' },
  { id: 'a-startup-club', title: '창업 동아리', field: 'startup', status: 'ongoing', schedule: '9월 ~ 12월 · 격주 화' },
  { id: 'a-hackathon', title: '가을 데이터 해커톤', field: 'data', status: 'ended', schedule: '10월 11일 끝남' },
  { id: 'a-pm-talk', title: '기획자 직무 특강', field: 'career', status: 'ended', schedule: '10월 8일 끝남' },
  { id: 'a-opencampus', title: '오픈 캠퍼스 안내 봉사', field: 'club', status: 'ended', schedule: '10월 10일 끝남' },
  { id: 'a-design-hack', title: '교내 디자인 해커톤', field: 'product', status: 'recorded', schedule: '9월 19일 끝남 · 기록했어요', recordId: 'e4' },
  { id: 'a-usability', title: '서비스 사용성 테스트', field: 'research', status: 'recorded', schedule: '10월 2일 끝남 · 기록했어요', recordId: 'e6' },
  { id: 'a-exchange', title: '교환학생 선발', field: 'global', status: 'declined', schedule: '다음 모집 2027-1학기' }
];

/** 이미 '맞아요'라고 한 발견(추천 반영 중). 나머지 발견은 확인 전이다. */
const CONFIRMED_KEYS = ['up:listen', 'up:present'];
export const EXAMPLE_CONFIRM: Record<string, Confirm> = Object.fromEntries(
  discoveriesOf(SEED_RECORDS.filter(r => r.useForRecommend)).filter(d => CONFIRMED_KEYS.includes(d.key)).map(d => [d.key, { status: 'yes' as const, sig: d.sig }])
);

/** 예시 학생은 공개로 시작한다(예시라서). 새 학생 기본값은 비공개 그대로다. */
export const EXAMPLE_VISIBILITY: Visibility = {
  profilePublic: true,
  hallOfFameConsent: false,
  hiddenActivityIds: [],
  sharedRecordIds: ['e2', 'r-mentor'],
  showcaseChallengeIds: ['role-swap', 'explainer']
};

/** 예시 학생이 이미 달성한 도전 과제의 달성 시각. 들어오자마자 달성 토스트가 쏟아지지 않게 미리 둔다. */
const at = (iso: string) => Date.parse(`${iso}T12:00:00+09:00`);
export const EXAMPLE_CHALLENGE_AT: Record<string, number> = {
  'first-retro': at('2024-05-20'),
  'three-paths': at('2025-03-28'),
  'first-places': at('2024-12-18'),
  'explainer': at('2025-05-22'),
  'role-swap': at('2025-11-27')
};

/** 경험 지도에서 학생이 '맞아요'라고 한 연결(기록~기록). 나머지 선은 AI 추정(점선)이다. */
export const EXAMPLE_EDGE_ANSWERS: Record<string, 'yes' | 'no'> = { 'e2~e6': 'yes', 'e3~r-survey': 'yes', 'r-mentee~r-mentor': 'yes' };
