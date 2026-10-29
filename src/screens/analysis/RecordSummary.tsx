import { Badge, FieldTag } from '../../components';
import type { RecordItem } from '../../domain/types';
import { DID_LABEL, ENERGY_SENTENCE } from '../../domain/vocab';

/** 서랍 안에서 기록 하나를 요약한다. 인용 한 줄, 한 일, 에너지. */
export function RecordSummary({ record }: { record: RecordItem }) {
  return (
    <article className="an-rec">
      <div className="an-rec__top">
        <b className="an-rec__title">{record.title}</b>
        <FieldTag field={record.field} detail />
      </div>
      <p className="an-rec__meta">{record.kind} · {record.date}</p>
      {record.quote && <p className="an-rec__quote">“{record.quote}”</p>}
      <p className="an-rec__tags">
        <Badge>{DID_LABEL[record.did]}</Badge>
        <span>{ENERGY_SENTENCE[record.energy]}</span>
      </p>
    </article>
  );
}
