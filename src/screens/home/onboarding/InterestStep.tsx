import { Icon } from '../../../components';
import { INTEREST_OPTIONS } from '../../../data/options';
import { MAX_INTERESTS, toggleInterest } from '../../../domain/recommend-flow/flow';
import type { Interest } from '../../../domain/types';
import { INTEREST_EXAMPLES, UNKNOWN_SUB } from './copy';

/**
 * 관심 분야: 칩 대신 낮은 카드(이름 + 그 분야 활동 예 두 개). 최대 3개, 고른 순서는 보이지 않는다.
 * '아직 모르겠어요'는 다른 선택을 지우는 배타 선택이라 한 줄 아래 따로 둔다.
 * 버튼 이름은 분야 이름만(활동 예는 설명으로 붙인다): 읽는 이름이 짧고, 검사 스크립트도 이름으로 누른다.
 */
export function InterestStep({ value, onChange, labelledBy }: { value: Interest[]; onChange: (v: Interest[]) => void; labelledBy: string }) {
  const full = value.filter(x => x !== 'unknown').length >= MAX_INTERESTS;
  return (
    <div className="onb-fields" role="group" aria-labelledby={labelledBy}>
      {INTEREST_OPTIONS.map(o => {
        const on = value.includes(o.id);
        const sub = o.id === 'unknown' ? UNKNOWN_SUB : INTEREST_EXAMPLES[o.id].join(', ');
        const blocked = full && !on && o.id !== 'unknown';
        return (
          <button
            key={o.id} type="button" className="onb-field" data-unknown={o.id === 'unknown' || undefined}
            aria-pressed={on} aria-disabled={blocked || undefined} aria-describedby={`onb-f-${o.id}`}
            onClick={() => { if (!blocked) onChange(toggleInterest(value, o.id)); }}
          >
            <b>{o.label}</b>
            <span id={`onb-f-${o.id}`}>{sub}</span>
            {on && <i className="onb-check" aria-hidden="true"><Icon name="check" size={16} /></i>}
          </button>
        );
      })}
    </div>
  );
}
