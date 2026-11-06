import type { IconName } from '../../components';
import type { GainKind } from '../../domain/types';

/** 얻는 것 종류의 아이콘. 가장 추천 카드와 자세히 모달이 같이 쓴다. */
export const GAIN_ICON: Record<GainKind, IconName> = { money: 'trophy', job: 'user', cert: 'doc', output: 'pencil', mentor: 'eye', people: 'friends', skill: 'leaf' };
