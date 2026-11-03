/**
 * 그림 안 이름을 낱말(공백) 단위로 줄바꿈한다. perLine 글자 안에 낱말이 들어가게 채우고, maxLines 줄을 넘으면 마지막 줄을 말줄임으로 끝낸다.
 * 낱말 하나가 perLine 보다 길면 그 낱말만 잘라 말줄임한다(낱말 가운데서 다음 줄로 넘기지 않는다).
 */
export function wrapWords(text: string, perLine: number, maxLines = 2): string[] {
  const clip = (w: string) => (Array.from(w).length > perLine ? `${Array.from(w).slice(0, Math.max(1, perLine - 1)).join('')}…` : w);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  let i = 0;
  for (; i < words.length; i++) {
    const next = cur ? `${cur} ${words[i]}` : words[i];
    if (Array.from(next).length <= perLine) { cur = next; continue; }
    if (!cur) { cur = clip(words[i]); continue; }
    if (lines.length + 1 >= maxLines) break;
    lines.push(cur);
    cur = words[i];
  }
  if (cur) lines.push(clip(cur));
  if (i < words.length) {
    const last = lines.length - 1;
    lines[last] = lines[last].endsWith('…') ? lines[last] : `${Array.from(lines[last]).slice(0, Math.max(1, perLine - 1)).join('').trimEnd()}…`;
  }
  return lines;
}
