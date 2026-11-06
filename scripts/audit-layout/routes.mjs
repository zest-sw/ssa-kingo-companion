/**
 * 검사할 경로를 라우트 표(src/app/router.ts 의 KNOWN_SUBS)에서 뽑는다.
 * 손으로 적는 것은 '*'(동적 id) 자리를 무엇으로 채울지(DYNAMIC)와 뺄 경로(EXCLUDE)뿐이다.
 * 라우트 표에 '*' 모양이 새로 생기거나 없어졌는데 아래 표가 따라가지 않으면 실패한다.
 */
import { readFileSync } from 'node:fs';
import ts from 'typescript';

/** '*' 자리를 채우는 법. ctx 는 학생 상태에서 뽑은 첫 후보들 */
const DYNAMIC = {
  'recommend/*': ctx => ctx.top,
  'recommend/prepare/*': ctx => ctx.top,
  'activities/records/interview/*': ctx => ctx.ended
};
/**
 * '*' 를 채운 경로 대신 화면이 지금 쓰는 주소 모양. 추천 모달은 ?open=<id> 로 연다.
 * 옛 주소 #/recommend/<id> 는 화면이 새 주소로 넘기고, 그 동작은 router·추천 도메인 테스트가 지킨다.
 */
const SHAPE = {
  'recommend/*': id => `recommend?open=${id}`
};
/** 학생 화면이 아니라서 빼는 경로와 이유 */
const EXCLUDE = {
  _kit: '컴포넌트 목록(개발용). 일부러 길게 스크롤한다',
  '_kit/*': '컴포넌트 목록(개발용)'
};

/** router.ts 원문에서 KNOWN_SUBS 객체를 읽는다. 배열 글자는 그대로, SETTINGS_NAV.map(n => n.id) 같은 식은 불러온 모듈로 푼다. */
function readKnownSubs(file, mods) {
  const src = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  let obj;
  src.forEachChild(function visit(n) {
    if (ts.isVariableDeclaration(n) && n.name.getText() === 'KNOWN_SUBS' && n.initializer && ts.isObjectLiteralExpression(n.initializer)) obj = n.initializer;
    n.forEachChild(visit);
  });
  if (!obj) throw new Error('router.ts 에서 KNOWN_SUBS 를 찾지 못했어요. 라우트 표 모양이 바뀌었으면 scripts/audit-layout/routes.mjs 를 고쳐 주세요.');
  const table = {};
  for (const p of obj.properties) {
    if (!ts.isPropertyAssignment(p)) throw new Error(`KNOWN_SUBS 의 모르는 항목: ${p.getText()}`);
    const key = p.name.getText().replace(/['"]/g, '');
    const v = p.initializer;
    if (ts.isArrayLiteralExpression(v)) {
      table[key] = v.elements.map(e => { if (!ts.isStringLiteral(e)) throw new Error(`KNOWN_SUBS.${key} 에 글자가 아닌 값: ${e.getText()}`); return e.text; });
    } else if (/^SETTINGS_NAV\.map\(\s*n\s*=>\s*n\.id\s*\)$/.test(v.getText())) {
      table[key] = mods.settings.SETTINGS_NAV.map(n => n.id);
    } else {
      throw new Error(`KNOWN_SUBS.${key} 의 값을 읽지 못했어요: ${v.getText()}`);
    }
  }
  return table;
}

/**
 * 학생 상태 하나에서 검사할 경로 목록. skipped 는 대상이 없어 못 그린 경로(예: 새 학생은 끝난 활동이 없다).
 * @returns {{ paths: string[], skipped: { path: string, why: string }[] }}
 */
export function routesFor(mods, routerFile, ctx) {
  const table = readKnownSubs(routerFile, mods);
  const patterns = Object.entries(table).flatMap(([name, subs]) => [name, ...subs.map(s => `${name}/${s}`)]);
  const dynamic = patterns.filter(p => p.includes('*'));
  const known = new Set([...Object.keys(DYNAMIC), ...Object.keys(EXCLUDE)]);
  const missing = dynamic.filter(p => !known.has(p));
  const stale = [...known].filter(p => !patterns.includes(p));
  if (missing.length || stale.length) {
    throw new Error(`라우트 표와 검사 경로 표가 어긋나요.\n  표에 있는데 채우는 법이 없는 경로: ${missing.join(', ') || '없음'}\n  표에서 사라진 경로: ${stale.join(', ') || '없음'}\n  scripts/audit-layout/routes.mjs 의 DYNAMIC·EXCLUDE 를 맞춰 주세요.`);
  }
  const paths = [], skipped = [];
  for (const pat of patterns) {
    if (EXCLUDE[pat]) { skipped.push({ path: pat, why: EXCLUDE[pat] }); continue; }
    let path = pat;
    if (DYNAMIC[pat]) {
      const id = DYNAMIC[pat](ctx);
      if (!id) { skipped.push({ path: pat, why: '이 상태에는 대상이 없어요' }); continue; }
      path = SHAPE[pat] ? SHAPE[pat](id) : pat.replace('*', id);
    }
    // 기본 하위로 넘기는 메뉴 경로(#/settings → #/settings/profile)는 넘긴 쪽만 본다.
    const fixed = mods.router.canonicalPath('#/' + path);
    if (fixed !== undefined) {
      if (patterns.includes(fixed) || paths.includes(fixed)) continue;
      throw new Error(`라우트 표에 있는 경로인데 주소가 바뀌어요: ${path} → ${fixed}`);
    }
    paths.push(path);
  }
  return { paths, skipped };
}

/** 저장값(localStorage)에서 상태를 되살려 '*' 자리에 넣을 첫 후보를 고른다. 화면(AppState)과 같은 함수를 쓴다. */
export function contextOf(mods, savedJson) {
  const state = mods.storage.restoreSaved(JSON.parse(savedJson));
  const view = mods.candidates.buildCandidates({
    catalog: mods.catalog.CATALOG, week: state.week, profile: state.profile, records: state.records, confirm: state.confirm, settings: state.settings,
    choices: state.choices, dislikedFields: state.dislikedFields, preferEasier: state.preferEasier, last: state.lastDone
  });
  return {
    top: view.primary?.p.id,
    ended: state.activities.find(a => a.status === 'ended')?.id
  };
}
