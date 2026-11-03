import { describe, expect, it } from 'vitest';
import { wrapWords } from './wrap';

describe('wrapWords', () => {
  it('낱말 가운데서 끊지 않는다', () => {
    expect(wrapWords('교내 디자인 해커톤', 6)).toEqual(['교내 디자인', '해커톤']);
    expect(wrapWords('동아리 캠페인 기획', 6)).toEqual(['동아리', '캠페인 기획']);
  });
  it('짧으면 한 줄', () => expect(wrapWords('리서치 스터디', 8)).toEqual(['리서치 스터디']));
  it('두 줄을 넘으면 말줄임', () => expect(wrapWords('서비스 사용성 테스트 하기', 6)).toEqual(['서비스', '사용성…']));
  it('낱말 하나가 너무 길면 그 낱말만 말줄임', () => expect(wrapWords('초장문낱말입니다', 4)).toEqual(['초장문…']));
});
