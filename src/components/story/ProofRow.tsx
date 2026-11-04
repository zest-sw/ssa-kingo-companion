import type { Proof } from '../../domain/insight/story';
import { Icon } from '../Icon';
import { ProofPic } from './ProofPic';

/** 새 학생의 빈 칸: 어떤 근거가 여기에 생기는지 이름만 */
const GHOSTS = ['나의 강점', '경험 지도', '관심 흐름', '테크 트리'];

type Props = {
  proofs: Proof[];
  /** 경로 → 주소 */
  hrefOf: (route: string) => string;
  /** row: 가로 칸(홈), list: 세로 줄(분석 요약) */
  layout?: 'row' | 'list';
};

/**
 * 이야기의 근거 3~4칸: 작은 그림 + 해석 한 줄 + 숫자 하나. 칸을 누르면 그 분석 화면.
 * 근거가 없으면(새 학생) 빈 칸 틀에 '회고 하나면 생겨요'만 둔다.
 */
export function ProofRow({ proofs, hrefOf, layout = 'row' }: Props) {
  if (proofs.length === 0) {
    return (
      <ul className={`ui-proofs ui-proofs--${layout} is-ghost`} aria-label="이야기의 근거">
        {GHOSTS.map(t => (
          <li key={t} className="ui-proof ui-proof--ghost">
            <span className="ui-proof__title">{t}</span>
            <span className="ui-pp ui-pp--ghost" aria-hidden="true" />
            <span className="ui-proof__value">첫 회고 뒤에 생겨요</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className={`ui-proofs ui-proofs--${layout}`} aria-label="이야기의 근거">
      {proofs.map(p => (
        <li key={p.kind}>
          <a className="ui-proof" href={hrefOf(p.route)}>
            <span className="ui-proof__title">{p.title}{layout === 'list' && <Icon name="chevron" size={14} />}</span>
            <span className="ui-proof__pic"><ProofPic pic={p.pic} /></span>
            <span className="ui-proof__text">
              <span className="ui-proof__line">{p.line}</span>
              <span className="ui-proof__value num">{p.value}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
