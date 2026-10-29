import { describe, expect, it } from 'vitest';
import { PROGRAM_BY_ID } from '../../data/catalog';
import { rec as baseRec } from '../fixtures.test-util';
import type { Activity, RecordItem } from '../types';
import { evaluate, isInProgress, newlyAchieved, showcaseable, type ChallengeDef } from './index';

// 기본은 학생이 남긴 기록. 예시 기록은 source: 'seed' 로 따로 만든다.
const rec = (id: string, over: Partial<RecordItem> = {}) => baseRec(id, { source: 'agent', ...over });
const act = (id: string, over: Partial<Activity> = {}): Activity => ({ id, title: id, field: 'dev', status: 'ongoing', schedule: '', ...over });
const defs: ChallengeDef[] = [
  { id: 'first', rule: 'firstRetro', hidden: false },
  { id: 'paths', rule: 'threePaths', hidden: false },
  { id: 'places', rule: 'firstPlaces', hidden: false },
  { id: 'retry', rule: 'retry', hidden: true },
  { id: 'campus', rule: 'twoCampus', hidden: true },
  { id: 'swap', rule: 'roleSwap', hidden: true }
];
const run = (records = [rec('s', { source: 'seed' })], activities: Activity[] = []) => evaluate(defs, { records, activities, programs: PROGRAM_BY_ID });
const by = (rs: ReturnType<typeof run>, id: string) => rs.find(r => r.def.id === id)!;

describe('도전 과제 달성 계산', () => {
  it('예시 기록만 있으면 첫 회고는 아직이다', () => {
    expect(by(run(), 'first').achieved).toBe(false);
  });
  it('예시 기록은 어떤 과제에도 세지 않는다', () => {
    const seeds = ['research', 'club', 'ai'].map((field, i) => rec(`s${i}`, { source: 'seed', field: field as RecordItem['field'], card: { role: '멘티' } }));
    const rs = run(seeds);
    expect(by(rs, 'first').achieved).toBe(false);
    expect(by(rs, 'paths').progress.value).toBe(0);
    expect(by(rs, 'swap').achieved).toBe(false);
  });
  it('학생이 쓴 회고가 생기면 첫 회고가 달성된다', () => {
    expect(by(run([rec('a', { source: 'agent' })]), 'first').achieved).toBe(true);
  });
  it('분야 묶음이 서로 다른 기록 수만큼 세 갈래 길이 찬다', () => {
    const two = run([rec('a', { field: 'research' }), rec('b', { field: 'product' }), rec('c', { field: 'club' })]);
    expect(by(two, 'paths').progress).toEqual({ value: 2, max: 3 });
    const three = run([rec('a', { field: 'research' }), rec('b', { field: 'club' }), rec('c', { field: 'ai' })]);
    expect(by(three, 'paths').achieved).toBe(true);
  });
  it('세 갈래 길은 3을 넘지 않는다', () => {
    const four = run([rec('a', { field: 'research' }), rec('b', { field: 'club' }), rec('c', { field: 'ai' }), rec('d', { field: 'dev' })]);
    expect(by(four, 'paths').progress.value).toBe(3);
  });
  it('끝난 활동만 처음 가 보는 곳에 센다', () => {
    const rs = run(undefined, [act('1', { status: 'ended' }), act('2', { status: 'recorded' }), act('3', { status: 'preparing' })]);
    expect(by(rs, 'places').progress).toEqual({ value: 2, max: 3 });
    expect(isInProgress(by(rs, 'places'))).toBe(true);
  });
  it('떨어진 프로그램에 다시 지원하면 다시 도전이다', () => {
    const rs = run(undefined, [act('1', { status: 'declined', programId: 'p-talk' }), act('2', { status: 'applied', programId: 'p-talk' })]);
    expect(by(rs, 'retry').achieved).toBe(true);
  });
  it('다른 프로그램만 있으면 다시 도전이 아니다', () => {
    expect(by(run(undefined, [act('1', { status: 'declined', programId: 'p-talk' }), act('2', { programId: 'p-chatbot' })]), 'retry').achieved).toBe(false);
  });
  it('숨은 과제는 진행 중으로 세지 않는다', () => {
    const rs = run(undefined, [act('1', { status: 'ended', programId: 'p-interview' })]);
    expect(by(rs, 'campus').progress.value).toBe(1);
    expect(isInProgress(by(rs, 'campus'))).toBe(false);
  });
  it('두 캠퍼스는 끝낸 활동의 장소로 센다', () => {
    const rs = run(undefined, [act('1', { status: 'ended', programId: 'p-interview' }), act('2', { status: 'recorded', programId: 'p-chatbot' })]);
    expect(by(rs, 'campus').achieved).toBe(true);
  });
  it('멘티와 멘토 역할이 둘 다 기록에 있어야 역할 바꾸기다', () => {
    expect(by(run([rec('a', { card: { role: '멘티' } })]), 'swap').achieved).toBe(false);
    expect(by(run([rec('a', { card: { role: '멘티' } }), rec('b', { card: { role: '멘토' } })]), 'swap').achieved).toBe(true);
  });
});

describe('새 달성과 전시', () => {
  it('이미 알린 것은 새 달성에서 뺀다', () => {
    const rs = run([rec('a', { source: 'agent', field: 'club' })]);
    expect(newlyAchieved(rs, new Set()).map(r => r.def.id)).toEqual(['first']);
    expect(newlyAchieved(rs, new Set(['first']))).toEqual([]);
  });
  it('전시 목록에는 달성한 과제만 남는다', () => {
    const rs = run([rec('a', { source: 'agent' })]);
    expect(showcaseable(rs, ['first', 'paths', 'gone'])).toEqual(['first']);
  });
});
