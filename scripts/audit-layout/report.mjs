/** 검사 결과를 화면 담당 영역별 표로 쓴다(.qa/layout/report.md·report.json)와 터미널 요약. */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const KIND = {
  'page-scroll': '페이지·본문 칸 세로 스크롤', 'page-hscroll': '가로 넘침', 'box-hscroll': '칸 안 가로 스크롤 막대', 'escapes-box': '카드·패널 밖으로 삐져나옴',
  'clipped-y': '잘림(세로)', 'clipped-x': '잘림(가로)', 'clipped-svg': '그림 잘림', overlap: '버튼과 글자 겹침', 'ctrl-overlap': '버튼끼리 겹침',
  'text-overlap': '글자끼리 겹침', offscreen: '창 밖 버튼', 'stretched-empty': '늘어난 빈 칸', 'tiny-text': '작은 글자', 'dup-label': '차트 이름표 중복',
  'skeleton-look': '로딩 뼈대 같은 빈 상태', 'half-empty': '오른쪽이 빈 화면', 'console-error': '콘솔 에러', 'run-error': '검사 실행 오류', truncated: '말줄임(경고)', 'route-changed': '주소 바뀜(경고)'
};

/** 화면 담당 영역: (A) 홈·추천·신청 준비 (B) 내 활동·일정·기록·회고 (C) 나의 분석·프로필·설정·온보딩 */
export function areaOf(r) {
  if (r.state === 'onboarding') return 'C';
  if (/^(home|recommend)/.test(r.path)) return 'A';
  if (/^activities/.test(r.path)) return 'B';
  return 'C';
}
const AREA = { A: '(A) 홈·추천·신청 준비', B: '(B) 내 활동·일정·기록·회고', C: '(C) 나의 분석·프로필·설정·온보딩' };

const cell = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function writeReports(out, results, skipped, states) {
  const rows = results.flatMap(r => r.issues.map(i => ({
    area: areaOf(r), state: r.state, size: `${r.size.w}x${r.size.h}`, route: r.path + (r.step ? ` @${r.step}` : ''), ...i, shot: r.shot
  })));
  const fails = rows.filter(r => r.level === 'fail').length;
  const warns = rows.length - fails;
  const retried = results.filter(r => r.retries);
  const retryTotal = retried.reduce((n, r) => n + r.retries, 0);
  writeFileSync(join(out, 'report.json'), JSON.stringify({ at: new Date().toISOString(), screens: results.length, retries: retryTotal, rows, skipped }, null, 2));

  const lines = ['# 레이아웃 검사 결과', '', `화면 ${results.length}개 · 실패 ${fails} · 경고 ${warns} · 다시 시도 ${retryTotal}번(${retried.length}화면)`, ''];
  const stateName = k => (k === 'onboarding' ? '가입 인터뷰' : states[k]?.label ?? k);
  for (const a of Object.keys(AREA)) {
    const list = rows.filter(r => r.area === a);
    lines.push(`## ${AREA[a]} (실패 ${list.filter(r => r.level === 'fail').length} · 경고 ${list.filter(r => r.level === 'warn').length})`, '');
    if (!list.length) { lines.push('걸린 것 없음', ''); continue; }
    lines.push('| 상태 | 크기 | 경로 | 항목 | 요소 | 상자·상대 | px | 스크린샷 |', '|---|---|---|---|---|---|---|---|');
    for (const r of list) lines.push(`| ${cell(stateName(r.state))} | ${r.size} | ${cell(r.route)} | ${cell(KIND[r.k] ?? r.k)} | ${cell(r.el)} | ${cell(r.with ?? r.box)} | ${r.d ?? ''} | ${r.shot} |`);
    lines.push('');
  }
  if (retried.length) {
    lines.push('## 다시 시도한 화면 (탐색·로드 일시 오류, 최대 2번)', '', '| 상태 | 크기 | 경로 | 다시 시도 |', '|---|---|---|---|');
    for (const r of retried) lines.push(`| ${cell(stateName(r.state))} | ${r.size.w}x${r.size.h} | ${cell(r.path + (r.step ? ` @${r.step}` : ''))} | ${r.retries}번 |`);
    lines.push('');
  }
  if (skipped.length) {
    lines.push('## 보지 않은 경로', '', ...skipped.map(s => `- ${stateName(s.state)} · ${s.path}: ${s.why}`), '');
  }
  writeFileSync(join(out, 'report.md'), lines.join('\n'));

  // 터미널: 항목 × 영역 개수 + 실패 앞 40줄
  const kinds = [...new Set(rows.map(r => r.k))];
  console.log('\n항목별 개수 (A / B / C)');
  for (const k of kinds) {
    const n = a => rows.filter(r => r.k === k && r.area === a).length;
    console.log(`  ${(KIND[k] ?? k).padEnd(18)} ${n('A')} / ${n('B')} / ${n('C')}`);
  }
  const failRows = rows.filter(r => r.level === 'fail');
  if (failRows.length) {
    console.log('\n실패 (앞 40건)');
    console.table(failRows.slice(0, 40).map(r => ({ 상태: r.state, 크기: r.size, 경로: r.route, 항목: KIND[r.k] ?? r.k, 요소: r.el, 상대: r.with ?? r.box ?? '', px: r.d ?? '', 위치: r.rect ? r.rect.join(',') : '', 스크린샷: r.shot })));
  }
  if (retryTotal) console.log(`\n다시 시도: ${retryTotal}번 (${retried.length}화면)`);
  return { fails, warns };
}
