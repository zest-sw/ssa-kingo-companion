import { describe, expect, it } from 'vitest';
import { INITIAL_STATE } from '../app/state';
import { exportMine, exportText } from './exportData';

describe('exportMine', () => {
  it('입력한 것만 담고 분석 결과(발견 확인, 근거)는 담지 않는다', () => {
    const out = exportMine(INITIAL_STATE);
    expect(Object.keys(out)).toEqual(expect.arrayContaining(['프로필', '활동', '기록', '설정', '알림', '공개범위']));
    expect(Object.keys(out)).not.toContain('confirm');
    expect(Object.keys(out)).not.toContain('reqEvidence');
  });
  it('글로 바꿔도 다시 읽힌다', () => {
    expect(() => JSON.parse(exportText(INITIAL_STATE))).not.toThrow();
  });
});
