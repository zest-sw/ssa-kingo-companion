/** 친구 얼굴 줄에 그릴 사람. max 명까지만 보이고 나머지는 개수로. */
export function faceRow<T>(people: T[], max: number): { shown: T[]; more: number } {
  return { shown: people.slice(0, max), more: Math.max(0, people.length - max) };
}

/** 이름 첫 글자. 이름이 비면 물음표. */
export const initialOf = (name: string) => Array.from(name.trim())[0] ?? '?';
