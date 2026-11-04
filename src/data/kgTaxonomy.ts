import type { Field } from '../domain/types';

// 활동 주제 키워드 사전. 경험 지도 묶음 이름을 정할 때 먼저 여기에 맞춘다(EDC 의 '정규화': 미리 정한 스키마가 있으면 그것에 맞춘다).
// 기회 DB 와 학생 분석이 같은 태그 체계를 쓰도록 분야(fields)도 함께 둔다. 키워드는 회고 글에 실제로 나오는 낱말 줄기로 쓴다.

export type KgTopic = { id: string; name: string; fields: Field[]; keywords: string[] };

export const KG_TAXONOMY: KgTopic[] = [
  { id: 'research', name: '사용자 리서치', fields: ['research'], keywords: ['리서치', '인터뷰', '설문', '사용자', '관찰', '응답', '사용성', '질문지'] },
  { id: 'plan', name: '서비스 기획', fields: ['product', 'startup'], keywords: ['기획', '문제 문장', '문제정의', '아이디어', '개선', '해결안', '불편', '서비스'] },
  { id: 'data', name: '데이터 분석', fields: ['data', 'ai'], keywords: ['데이터', '분석', '시각화', '차트', '지도', '머신러닝', '모델', '지표'] },
  { id: 'devBasic', name: '개발 기초', fields: ['dev'], keywords: ['파이썬', '알고리즘', '예제', '코드', '문제 두', '풀이', '계산기'] },
  { id: 'devMake', name: '개발 프로젝트', fields: ['dev'], keywords: ['개발', '해커톤', '웹', '봇', '만들', '시연', '기능', '화면'] },
  { id: 'share', name: '멘토링·나눔', fields: ['mentor'], keywords: ['멘토', '멘티', '튜터', '신입', '설명', '가르'] },
  { id: 'global', name: '글로벌 교류', fields: ['global'], keywords: ['교환학생', '해외', '나라', '유학생', '글로벌', '교류'] },
  { id: 'club', name: '동아리 활동', fields: ['club'], keywords: ['동아리', '캠페인', '부원', '참여자'] },
  { id: 'career', name: '진로 탐색', fields: ['career'], keywords: ['진로', '커리어', '포트폴리오', '직무', '자기소개'] }
];
