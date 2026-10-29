import './switch.css';

/** 켜고 끄는 스위치. 라벨은 눈에 보이는 글자로 두고, 켜짐 상태는 aria-checked 로 알린다. */
export function Switch({ checked, onChange, label, hideLabel }: { checked: boolean; onChange: (next: boolean) => void; label: string; hideLabel?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={hideLabel ? label : undefined} className="cf-switch" onClick={() => onChange(!checked)}>
      <span className="cf-switch__track" aria-hidden="true"><span className="cf-switch__thumb" /></span>
      {!hideLabel && <span className="cf-switch__label">{label}</span>}
    </button>
  );
}
