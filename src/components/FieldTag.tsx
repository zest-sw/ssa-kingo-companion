import type { Field } from '../domain/types';
import { FIELD_GROUP, GROUP_LABEL } from '../domain/vocab';

/**
 * 분야 점 + 라벨. 색은 분야 묶음으로 고정이다(개발=그린, AI·데이터=네이비, 창업·기획=연두, 멘토링=오렌지, 글로벌=회색).
 * 색만으로 구분하지 않게 라벨을 늘 함께 둔다. 라벨은 화면 어디서나 분야 묶음 이름 하나다.
 */
export function FieldTag({ field }: { field: Field }) {
  const group = FIELD_GROUP[field];
  return (
    <span className="ui-field">
      <span className={`ui-field__dot ui-field__dot--${group}`} aria-hidden="true" />
      {GROUP_LABEL[group]}
    </span>
  );
}
