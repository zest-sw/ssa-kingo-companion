import { discState } from '../discoveries';
import type { Confirm, Discovery } from '../types';

/** 학생이 '맞아요'로 확인해서 지금 추천에 쓰는 발견 수. 근거가 바뀐 것(changed)은 세지 않는다. */
export const usedCount = (discoveries: Discovery[], confirm: Record<string, Confirm>) => discoveries.filter(d => discState(d, confirm) === 'yes').length;
