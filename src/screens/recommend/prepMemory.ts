import { parsePrepMemory, type PrepMemory } from '../../domain/recommend-flow/prepare';

// 신청 준비를 중간에 나갔다 와도 그 단계로 돌아오게 탭 하나 동안 남긴다.
// ponytail: 브라우저 탭을 닫으면 사라진다. 활동에 단계 필드가 생기면 앱 저장값으로 옮긴다.
const key = (programId: string) => `kingo-companion:prepare:${programId}`;

export function loadPrep(programId: string): PrepMemory | undefined {
  try {
    const raw = window.sessionStorage.getItem(key(programId));
    return raw === null ? undefined : parsePrepMemory(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

export function savePrep(programId: string, memory: PrepMemory | undefined) {
  try {
    if (memory) window.sessionStorage.setItem(key(programId), JSON.stringify(memory));
    else window.sessionStorage.removeItem(key(programId));
  } catch {
    // 저장이 막힌 창(사생활 보호 모드)에서는 이어하기만 빠진다.
  }
}
