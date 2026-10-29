import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 에이전트 말풍선을 '입력 중' 표시 뒤에 하나씩 보여 주는 대기열(비동기 상태 흉내).
 * 실제 AI 가 없어 지연은 고정값이다.
 */
export function useAgentQueue(show: (text: string) => void, delay = 650) {
  const queue = useRef<string[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const [typing, setTyping] = useState(false);
  const showRef = useRef(show);
  showRef.current = show;

  const pump = useCallback(() => {
    if (timer.current !== undefined || queue.current.length === 0) return;
    setTyping(true);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      const text = queue.current.shift();
      if (text !== undefined) showRef.current(text);
      if (queue.current.length) pump(); else setTyping(false);
    }, delay);
  }, [delay]);

  const say = useCallback((texts: string[]) => { queue.current.push(...texts); pump(); }, [pump]);

  /** 아직 보이지 않은 말을 모두 꺼내고 멈춘다(초안 저장용) */
  const drain = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    const rest = queue.current;
    queue.current = [];
    setTyping(false);
    return rest;
  }, []);

  useEffect(() => () => { window.clearTimeout(timer.current); timer.current = undefined; queue.current = []; }, []);

  return { typing, say, drain };
}
