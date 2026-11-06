import { Icon, type IconName } from '../../components';

/** 사실 한 칸: 아이콘 + 이름 + 큰 값 + 작은 보충. 추천 카드(3칸)와 자세히(4칸)가 같이 쓴다. */
export function Fact({ icon, label, value, sub, accent }: { icon: IconName; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rec-fact">
      <span className="rec-fact__icon"><Icon name={icon} /></span>
      <dl>
        <dt>{label}</dt>
        <dd className={accent ? 'rec-fact__val rec-fact__val--near num' : 'rec-fact__val num'}>{value}</dd>
        {sub && <dd className="rec-fact__sub" title={sub}>{sub}</dd>}
      </dl>
    </div>
  );
}
