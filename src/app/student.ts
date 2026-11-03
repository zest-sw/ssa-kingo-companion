import { GROUP_LABEL } from '../domain/vocab';
import type { Profile } from '../domain/types';

/** 가입에서 받은 관심 분야 한 줄('AI·데이터 · 창업·기획'). 모르겠다고 했으면 그렇게, 안 골랐으면 빈 글 */
export function interestLine(p: Profile): string {
  const named = p.interests.filter(i => i !== 'unknown').map(i => GROUP_LABEL[i]);
  if (named.length) return named.join(' · ');
  return p.interests.includes('unknown') ? '관심 분야 찾는 중' : '';
}

/** 사이드바 학생 카드 두 줄. 예시로 볼 때만 예시 학생 정보를 쓰고, 새 학생은 '내 프로필' + 관심 분야 한 줄이다 */
export function studentCard(demo: boolean, p: Profile): { name: string; sub: string } {
  if (demo) return { name: '소프트웨어학과', sub: '3학년 · 예시 학생' };
  return { name: '내 프로필', sub: interestLine(p) || '관심 분야를 골라 보세요' };
}
