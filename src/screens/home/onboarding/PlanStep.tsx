import { Icon } from '../../../components';
import { FORMAT_OPTIONS } from '../../../data/options';
import type { Format } from '../../../domain/types';
import { TIME_OPTIONS } from '../../../domain/vocab';

type Opt<T> = { value: T; label: string; sub: string };

function Options<T extends string | number>({ id, label, options, value, onPick }: { id: string; label: string; options: Opt<T>[]; value: T; onPick: (v: T) => void }) {
  return (
    <div className="onb-group">
      <p className="onb-group__label" id={id}>{label}</p>
      <div className="onb-options" role="group" aria-labelledby={id}>
        {options.map(o => (
          <button key={o.value} type="button" className="onb-option" aria-pressed={value === o.value} onClick={() => onPick(o.value)}>
            <b>{o.label}</b><span>{o.sub}</span>
            {value === o.value && <i className="onb-check" aria-hidden="true"><Icon name="check" size={16} /></i>}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 시간·방식. 기본값(2~3시간, 상관없어요)이 미리 골라져 있어 바로 넘어가도 된다. */
export function PlanStep({ time, format, onTime, onFormat }: { time: number; format: Format; onTime: (v: number) => void; onFormat: (v: Format) => void }) {
  return (
    <>
      <Options id="onb-time" label="시간" options={TIME_OPTIONS} value={time} onPick={onTime} />
      <Options id="onb-format" label="방식" options={FORMAT_OPTIONS} value={format} onPick={onFormat} />
    </>
  );
}
