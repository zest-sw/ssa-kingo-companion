import type { RecordCard, RecordItem } from '../../domain/types';

/** 인터뷰를 거치지 않은 기록(예시·직접 입력)은 메모를 '한 일', 한마디를 '배운 점'으로 보여 준다. */
export const cardOf = (r: RecordItem): RecordCard => r.card ?? { ...(r.note && { action: r.note }), ...(r.quote && { learned: r.quote }) };
