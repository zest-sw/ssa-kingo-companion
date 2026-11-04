import { KG_TAXONOMY } from '../../data/kgTaxonomy';
import type { Program, RecordItem } from '../types';

// 그래프 생성·이름 짓기가 함께 쓰는 글 다루기: 기록 글 모으기, 낱말 나누기, 사전 키워드 찾기.

/** 기록 한 개의 글: 제목, 한 일, 회고, 기록 카드 */
export function recordText(r: RecordItem): string {
  const c = r.card ?? {};
  return [r.title, r.note, r.quote, c.situation, c.role, c.action, c.result, c.learned, c.next].filter(Boolean).join(' ');
}
export const programText = (p: Program) => `${p.title} ${p.summary}`;

// 조사·어미를 떼어 낱말 줄기만 남긴다. 형태소 분석기 대신 쓰는 간단한 규칙이다.
// ponytail: 규칙 어미 떼기라 '만들었다'·'만든' 같은 활용형이 다른 낱말로 남는다, 실제 LLM·형태소 분석기를 붙일 때 바꾼다.
const SUFFIX = ['으로부터', '에서는', '에게서', '으로', '에서', '에게', '부터', '까지', '처럼', '보다', '했다', '했고', '하고', '하는', '하며', '이다', '였다', '을', '를', '이', '가', '은', '는', '에', '의', '로', '과', '와', '도', '만', '한', '할', '해'];
const STOP = new Set(['그', '것', '수', '더', '내', '나', '다시', '먼저', '매주', '두', '세', '네', '하나', '처음', '같은', '다른', '실제로', '있었다', '됐다', '됐고', '있게', '동안', '마지막', '이번', '한번', '학기', '1학년', '2학년', '3학년', '1학기', '2학기', '여름', '겨울', '방학', '모아', '모았다', '정리', '정리했다', '나눠', '주차', '때', '뒤', '앞', '위', '번']);

export function tokens(text: string): string[] {
  return text
    .split(/[^ㄱ-힣a-zA-Z0-9]+/)
    .map(w => {
      for (const s of SUFFIX) if (w.length > s.length + 1 && w.endsWith(s)) return w.slice(0, -s.length);
      return w;
    })
    .filter(w => w.length >= 2 && !STOP.has(w) && !/^\d+$/.test(w));
}

/** 글에 든 사전 키워드(띄어쓰기 무시). 주제마다 맞은 키워드 */
export function keywordsIn(text: string): { topic: string; keyword: string }[] {
  const flat = text.replace(/\s+/g, '');
  return KG_TAXONOMY.flatMap(t => t.keywords.filter(k => flat.includes(k.replace(/\s+/g, ''))).map(k => ({ topic: t.id, keyword: k })));
}
