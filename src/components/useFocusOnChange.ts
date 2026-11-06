import { useEffect, useRef, type RefObject } from 'react';

type Target = RefObject<HTMLElement | null> | (() => HTMLElement | null | undefined);
type Options = {
  /** 첫 그림에도 옮긴다(끝 장면처럼 나타나자마자 읽혀야 하는 곳). 기본은 첫 그림을 건너뛴다: 화면 첫 초점은 앱 틀이 제목에 준다 */
  onMount?: boolean;
  /** false 면 이번 변화에는 옮기지 않는다(예: 폼을 열 때는 말고 닫을 때만) */
  when?: boolean;
  /** 화면을 그 자리로 스크롤한다. 기본은 스크롤하지 않는다 */
  scroll?: boolean;
  /** 입력 칸이면 글 끝에 커서를 둔다 */
  caretEnd?: boolean;
};

/**
 * 초점 규칙 하나: 누른 버튼이 사라지는 전환(새 단계, 끝 장면, 폼 닫기)에서 key 가 바뀌면 가까운 제목·자리로 초점을 옮긴다.
 * 초점이 body 로 떨어져 키보드 자리를 잃지 않고, 화면 읽기도 새 자리부터 읽는다.
 *   useFocusOnChange(scene, step)                  단계가 바뀌면 새 단계로(첫 그림 제외)
 *   useFocusOnChange(head, null, { onMount: true }) 나타날 때 한 번
 */
export function useFocusOnChange(target: Target, key: unknown, opts: Options = {}) {
  // 지난번에 본 key. 처음 그림인지와 같은 key 로 다시 돈 것(StrictMode 의 두 번 실행)을 가린다
  const seen = useRef<{ key: unknown } | null>(null);
  const get = useRef(target);
  get.current = target;
  const { onMount = false, when = true, scroll = false, caretEnd = false } = opts;
  useEffect(() => {
    const firstRun = seen.current === null;
    if (!firstRun && Object.is(seen.current!.key, key)) return;
    seen.current = { key };
    if ((firstRun && !onMount) || !when) return;
    const t = get.current;
    const el = typeof t === 'function' ? t() : t.current;
    if (!el) return;
    el.focus({ preventScroll: !scroll });
    if (caretEnd && (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)) el.setSelectionRange(el.value.length, el.value.length);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}
