import { TIME_OPTIONS } from './vocab';

/** 마지막 글자에 받침이 있는지. 한글이 아니면 false. */
export const hasBatchim = (w: string) => {
  const t = w.trim();
  const c = t.charCodeAt(t.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
};
/** josa('기록', '을', '를') → '을' */
export const josa = (w: string, withB: string, noB: string) => (hasBatchim(w) ? withB : noB);

export const ddayText = (d: number) => (d <= 0 ? '오늘까지' : `D-${d}`);
export const timeLabel = (t: number) => TIME_OPTIONS.find(o => o.value === t)?.label ?? `${t}시간`;
