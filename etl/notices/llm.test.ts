import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NoticeRow } from './cse.ts';
import {
  clip, DEFAULT_MODEL, fromLlm, makeAsk, ollamaBase, parseAnswer, PROMPT_PARTS, PROMPT_VERSION, userMessage, versionOf,
  type LlmAnswer, type Post
} from './llm.ts';

const row = (no: number, title = '[가나다] 인턴 모집', board = '채용/모집'): NoticeRow => ({ no, title, board, postedAt: '2026-11-01', pinned: false });
const tmp = () => mkdtempSync(join(tmpdir(), 'cse-llm-'));
/** Ollama /api/chat 꼴의 응답(직접 만든 값) */
const reply = (content: string, status = 200) => ({ status, text: async () => JSON.stringify({ message: { role: 'assistant', content } }) });
const OK = '{"기회":"O","종류":"교육·캠프","주최":"가나다","확신":"높음"}';
const fakePost = (...answers: (ReturnType<typeof reply> | Error)[]) =>
  vi.fn<Post>(async () => {
    const a = answers.length > 1 ? answers.shift()! : answers[0];
    if (a instanceof Error) throw a;
    return a;
  });
const netError = (code?: string) => Object.assign(new TypeError('fetch failed'), code ? { cause: { code } } : {});

describe('clip / userMessage', () => {
  it('앞 60줄과 그 뒤 날짜·신청 단어 줄만, 120줄까지', () => {
    const lines = [...Array.from({ length: 60 }, (_, i) => `앞 줄 ${i}`), '안내 문장', '신청 기간 안내', ...Array.from({ length: 100 }, () => '접수 안내')];
    const out = clip(lines);
    expect(out).toHaveLength(120);
    expect(out.slice(0, 60)).toEqual(lines.slice(0, 60));
    expect(out).not.toContain('안내 문장');
    expect(out[60]).toBe('신청 기간 안내');
  });

  it('한 줄은 300자, 합쳐 8,000자까지', () => {
    const out = clip(Array.from({ length: 40 }, () => '가'.repeat(400)));
    expect(out[0]).toBe(`${'가'.repeat(300)}…`);
    expect(out.reduce((n, l) => n + l.length, 0)).toBeLessThanOrEqual(8000);
    expect(out.length).toBe(26);
  });

  it('게시판·제목·본문 줄을 넣고, 본문 글자가 없으면 그렇다고 적는다', () => {
    expect(userMessage(row(1, '[가나다] $& 인턴', ''), ['신청 기간: 11/1 ~ 11/9'])).toBe('게시판: (분류 없음)\n제목: [가나다] $& 인턴\n본문 글자 1줄:\n| 신청 기간: 11/1 ~ 11/9');
    expect(userMessage(row(1), [])).toBe('게시판: 채용/모집\n제목: [가나다] 인턴 모집\n본문 글자 없음(그림·첨부뿐)');
  });
});

describe('parseAnswer', () => {
  it.each([
    ['정상', OK, { verdict: 'O', kind: 'edu', host: '가나다', sure: true }],
    ['코드 블록', '```json\n{"기회":"O","종류":"특강","주최":"없음","확신":"낮음"}\n```', { verdict: 'O', kind: 'lecture', host: null, sure: false }],
    ['빈 주최는 없음', '{"기회":"O","종류":"채용","주최":"  ","확신":"높음"}', { verdict: 'O', kind: 'job', host: null, sure: true }],
    ['X면 종류·주최를 버린다', '{"기회":"X","종류":"채용","주최":"가나다","확신":"높음"}', { verdict: 'X', kind: null, host: null, sure: true }],
    ['41자 주최는 버리고 답은 받는다', `{"기회":"O","종류":"채용","주최":"${'가'.repeat(41)}","확신":"높음"}`, { verdict: 'O', kind: 'job', host: null, sure: true }]
  ] as const)('%s', (_name, text, expected) => {
    expect(parseAnswer(text)).toEqual(expected);
  });

  it.each([
    ['모르는 종류', '{"기회":"O","종류":"대회","주최":"없음","확신":"높음"}'],
    ['O인데 빈 종류', '{"기회":"O","종류":"","주최":"없음","확신":"높음"}'],
    ['확신 값', '{"기회":"O","종류":"채용","주최":"없음","확신":"보통"}'],
    ['깨진 JSON', '{"기회":"O",'],
    ['JSON이 아님', '기회입니다']
  ])('실패: %s', (_name, text) => {
    expect(parseAnswer(text)).toBeNull();
  });
});

describe('fromLlm', () => {
  const O = (sure: boolean): LlmAnswer => ({ verdict: 'O', kind: 'lecture', host: '가나다', sure });
  const X = (sure: boolean): LlmAnswer => ({ verdict: 'X', kind: null, host: null, sure });
  it.each([
    // 답의 주최는 판정에 넣지 않는다(주최는 제목 규칙 값, 스펙 2 FR-001)
    ['O 높음', O(true), 'review', { verdict: 'opportunity', kind: 'lecture', rule: 'LLM: m' }],
    ['O 낮음 accept', O(false), 'accept', { verdict: 'opportunity', kind: 'lecture', rule: 'LLM: m' }],
    ['O 낮음 review', O(false), 'review', { verdict: 'review', why: 'LLM 확신 낮음' }],
    ['X 높음', X(true), 'review', { verdict: 'not', rule: 'LLM: m' }],
    ['X 낮음 accept', X(false), 'accept', { verdict: 'not', rule: 'LLM: m' }],
    ['X 낮음 review', X(false), 'review', { verdict: 'review', why: 'LLM 확신 낮음' }]
  ] as const)('%s', (_name, a, low, expected) => {
    expect(fromLlm(a, 'm', low)).toEqual(expected);
  });
});

describe('판과 설정', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('판은 요청 틀 전체(지시문·사용자 틀·스키마·think·options·자르기 한도·단어)에서 나오고, 하나만 바뀌어도 바뀐다', () => {
    expect(Object.keys(PROMPT_PARTS).sort()).toEqual(['key', 'limits', 'options', 'schema', 'system', 'think', 'user']);
    expect(PROMPT_VERSION).toBe(versionOf(PROMPT_PARTS));
    expect(versionOf({ ...PROMPT_PARTS, user: `${PROMPT_PARTS.user} ` })).not.toBe(PROMPT_VERSION);
    expect(versionOf({ ...PROMPT_PARTS, limits: { ...PROMPT_PARTS.limits, head: 61 } })).not.toBe(PROMPT_VERSION);
    expect(versionOf({ ...PROMPT_PARTS, options: { ...PROMPT_PARTS.options, num_ctx: 8192 } })).not.toBe(PROMPT_VERSION);
  });

  it.each([
    [undefined, 'http://127.0.0.1:11434'],
    ['', 'http://127.0.0.1:11434'],
    ['0.0.0.0', 'http://0.0.0.0:11434'],
    ['localhost:8080', 'http://localhost:8080'],
    ['http://127.0.0.1:11999/', 'http://127.0.0.1:11999'],
    ['https://x:1/', 'https://x:1'],
    ['https://x', 'https://x']
  ])('OLLAMA_HOST %s → %s', (raw, base) => {
    expect(ollamaBase(raw)).toBe(base);
  });

  it('모델은 KINGO_LLM_MODEL, 없으면 기본 모델', () => {
    vi.stubEnv('KINGO_LLM_MODEL', '');
    expect(makeAsk({ dir: tmp() }).model).toBe(DEFAULT_MODEL);
    vi.stubEnv('KINGO_LLM_MODEL', 'qwen-test:7b');
    expect(makeAsk({ dir: tmp() }).model).toBe('qwen-test:7b');
  });
});

describe('makeAsk: 묻기와 보관', () => {
  it('요청은 /api/chat, 생각 끄기, 온도 0, 문맥 길이 16384, 답 스키마다', async () => {
    const post = fakePost(reply(OK));
    await makeAsk({ model: 'm', host: 'localhost:9', dir: tmp(), post })(row(1), ['신청 기간: 11/1 ~ 11/9']);
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('http://localhost:9/api/chat');
    const req = JSON.parse(body);
    expect(req).toMatchObject({ model: 'm', stream: false, think: false, options: { temperature: 0, num_ctx: 16384 } });
    expect(req.format.properties['종류'].enum).toHaveLength(12);
    expect(req.messages.map((m: { role: string }) => m.role)).toEqual(['system', 'user']);
  });

  it('같은 글·모델·판이면 다시 묻지 않고 보관한 답을 쓴다. 모델 이름의 /·:는 폴더에서 _', async () => {
    const dir = tmp();
    const post = fakePost(reply(OK));
    const ask = makeAsk({ model: 'hf.co/x:latest', dir, post });
    expect(await ask(row(7), [])).toEqual({ answer: { verdict: 'O', kind: 'edu', host: '가나다', sure: true }, cached: false });
    expect(await ask(row(7), [])).toMatchObject({ cached: true });
    expect(post).toHaveBeenCalledTimes(1);
    expect(readdirSync(join(dir, 'hf.co_x_latest', PROMPT_VERSION))).toEqual(['7.json']);
  });

  it('다른 판의 답은 쓰지 않고 다시 묻는다', async () => {
    const dir = tmp();
    mkdirSync(join(dir, 'm', 'oldoldol'), { recursive: true });
    writeFileSync(join(dir, 'm', 'oldoldol', '7.json'), JSON.stringify({ answer: { verdict: 'X', kind: null, host: null, sure: true } }));
    const post = fakePost(reply(OK));
    expect(await makeAsk({ model: 'm', dir, post })(row(7), [])).toMatchObject({ cached: false });
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('깨진 보관 파일은 없는 것으로 보고 다시 묻는다', async () => {
    const dir = tmp();
    mkdirSync(join(dir, 'm', PROMPT_VERSION), { recursive: true });
    writeFileSync(join(dir, 'm', PROMPT_VERSION, '7.json'), '{"answer": {"verdict": "O", "kind": "대회"');
    const post = fakePost(reply(OK));
    expect(await makeAsk({ model: 'm', dir, post })(row(7), [])).toMatchObject({ cached: false });
  });

  it('실패한 답은 보관하지 않아 다음에 다시 묻는다', async () => {
    const dir = tmp();
    const post = fakePost(reply('기회입니다'), reply(OK));
    const ask = makeAsk({ model: 'm', dir, post });
    expect(await ask(row(7), [])).toBe('fail');
    expect(existsSync(join(dir, 'm', PROMPT_VERSION, '7.json'))).toBe(false);
    expect(await ask(row(7), [])).toMatchObject({ cached: false });
    expect(post).toHaveBeenCalledTimes(2);
  });
});

describe('makeAsk: 실패 구분 (스펙 2 contracts/llm.md)', () => {
  it.each([
    ['연결 거부', netError('ECONNREFUSED')],
    ['주소 해석 실패', netError('ENOTFOUND')],
    ['연결 제한 시간', netError('UND_ERR_CONNECT_TIMEOUT')],
    ['URL 꼴 아님', new TypeError('Invalid URL')]
  ])('응답 전 오류(%s)는 down이고, 그 뒤로는 서버를 부르지 않는다', async (_name, error) => {
    const post = fakePost(error);
    const ask = makeAsk({ model: 'm', dir: tmp(), post });
    expect(await ask(row(1), [])).toBe('down');
    expect(await ask(row(2), [])).toBe('down');
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('모델 없음(404)도 down이고, 끊긴 뒤에도 보관한 답은 읽는다', async () => {
    const dir = tmp();
    await makeAsk({ model: 'm', dir, post: fakePost(reply(OK)) })(row(1), []);
    const post = fakePost(reply('', 404));
    const ask = makeAsk({ model: 'm', dir, post });
    expect(await ask(row(2), [])).toBe('down');
    expect(await ask(row(1), [])).toMatchObject({ cached: true });
    expect(await ask(row(3), [])).toBe('down');
    expect(post).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['서버에 닿은 뒤 시간 초과', Object.assign(new Error('timeout'), { name: 'TimeoutError' })],
    ['HTTP 500', reply('', 500)],
    ['답 검사 실패', reply('{"기회":"O","종류":"대회","주최":"없음","확신":"높음"}')]
  ])('%s는 이 글만 fail이고 다음 글은 계속 묻는다', async (_name, first) => {
    const post = fakePost(first, reply(OK));
    const ask = makeAsk({ model: 'm', dir: tmp(), post });
    expect(await ask(row(1), [])).toBe('fail');
    expect(await ask(row(2), [])).toMatchObject({ cached: false });
  });
});
