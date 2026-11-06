// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { PrepItem } from '../../domain/recommend-flow/flow';
import { TodoStep } from './PrepSteps';

const items: PrepItem[] = [
  { id: 'team', label: '팀 구성', by: 'me', done: false },
  { id: 'draft', label: '신청서 초안 확인', by: 'me', done: false },
  { id: 'survey', label: '사전 설문 답하기', by: 'me', done: false, outside: '설문 열기' }
];
const rows = (enabled = true) => {
  const el = document.createElement('div');
  el.innerHTML = renderToStaticMarkup(
    <TodoStep items={items} week={1} enabled={enabled} draftReady left={3} log={[]} summary={{ text: '' }} onToggle={() => {}} onOpened={() => {}} />
  );
  return [...el.querySelectorAll('.rec-item')].map(li => ({ label: li.querySelector('.rec-item__label')?.textContent, box: !!li.querySelector('input[type=checkbox]') }));
};

it('지금 누를 수 있는 할 일만 체크 칸이고, 초안 확인과 열기 전 바깥 일은 상태 아이콘이다', () => {
  expect(rows()).toEqual([
    { label: '팀 구성', box: true },
    { label: '신청서 초안 확인', box: false },
    { label: '사전 설문 답하기', box: false }
  ]);
});

it('누를 수 없는 체크 칸(disabled)은 두지 않는다', () => {
  expect(rows(false).every(r => !r.box)).toBe(true);
});
