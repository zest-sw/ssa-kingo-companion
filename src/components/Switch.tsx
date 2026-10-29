/** 켜고 끄는 스위치. 라벨은 눈에 보이는 글자로 두고, 켜짐 상태는 aria-checked 로 알린다. hideLabel 이면 라벨을 aria-label 로만 단다. */
export function Switch({ checked, onChange, label, hideLabel }: { checked: boolean; onChange: (next: boolean) => void; label: string; hideLabel?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={hideLabel ? label : undefined} className="ui-switch" onClick={() => onChange(!checked)}>
      <span className="ui-switch__track" aria-hidden="true"><span className="ui-switch__thumb" /></span>
      {!hideLabel && <span className="ui-switch__label">{label}</span>}
    </button>
  );
}
