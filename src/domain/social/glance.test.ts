import { describe, expect, it } from 'vitest';
import { faceRow, initialOf } from './glance';

describe('친구 얼굴 줄', () => {
  it('max 명까지 보이고 나머지는 개수', () => {
    expect(faceRow([1, 2, 3, 4, 5], 3)).toEqual({ shown: [1, 2, 3], more: 2 });
    expect(faceRow([1, 2], 3)).toEqual({ shown: [1, 2], more: 0 });
    expect(faceRow([], 3)).toEqual({ shown: [], more: 0 });
  });
  it('이름 첫 글자', () => {
    expect(initialOf('다온')).toBe('다');
    expect(initialOf('  ')).toBe('?');
  });
});
