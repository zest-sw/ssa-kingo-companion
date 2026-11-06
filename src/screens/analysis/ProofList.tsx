import { hrefOf } from '../../app/router';
import { Icon, ProofPic, ProofRow } from '../../components';
import type { Proof } from '../../domain/insight/story';
import { EvidenceBar } from './EvidenceBar';

/**
 * 한눈에의 근거 줄(세로 목록). 공용 ProofRow 와 같은 모양인데, 강점 줄만 점 막대 대신 두 겹 막대 + '확인 10 / 전체 14'.
 * ponytail: 공용 ProofPic 의 강점 그림이 점 막대라 화면 안에서 감쌌다, 공용 부품이 막대로 바뀌면 ProofRow 로 돌아간다.
 */
export function ProofList({ proofs }: { proofs: Proof[] }) {
  if (proofs.length === 0) return <ProofRow proofs={proofs} hrefOf={hrefOf} layout="list" />;
  return (
    <ul className="ui-proofs ui-proofs--list" aria-label="이야기의 근거">
      {proofs.map(p => (
        <li key={p.kind}>
          <a className="ui-proof" href={hrefOf(p.route)}>
            <span className="ui-proof__title">{p.title}<Icon name="chevron" size={14} /></span>
            <span className="ui-proof__pic">
              {p.pic.kind === 'strength' ? <EvidenceBar confirmed={p.pic.confirmed} total={p.pic.total} text={false} /> : <ProofPic pic={p.pic} />}
            </span>
            <span className="ui-proof__text">
              <span className="ui-proof__line">{p.line}</span>
              <span className="ui-proof__value num">{p.pic.kind === 'strength' ? `확인 ${p.pic.confirmed} / 전체 ${p.pic.total}` : p.value}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
