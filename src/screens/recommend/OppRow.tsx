import { Badge, Icon, type IconName } from '../../components';
import { ddayOf } from '../../domain/recommend';
import { isNearDeadline, plainText } from '../../domain/recommend-flow/flow';
import { CATEGORY_LABEL, categoryOf, rowGains } from '../../domain/recommend-flow/opportunities';
import { ddayText } from '../../domain/text';
import type { GainKind, Program } from '../../domain/types';

export const GAIN_ICON: Record<GainKind, IconName> = { money: 'trophy', job: 'user', cert: 'doc', output: 'pencil', mentor: 'eye', people: 'friends', skill: 'leaf' };

/** 얻는 것 칩 하나: 아이콘 + 짧은 이름. 누를 수 없는 표시다 */
export function GainChip({ kind, label }: { kind: GainKind; label: string }) {
  return <span className="rec-gain" data-kind={kind}><Icon name={GAIN_ICON[kind]} size={14} />{label}</span>;
}

/**
 * 기회 한 줄(추천 활동·전체 기회 탭이 같이 쓴다): 제목, 종류·주최(빠듯하면 주최 대신 부담), 얻는 것 칩 2~3개, 왜 나에게 한 줄, 오른쪽 D-n.
 * 누르면 가운데 모달로 자세히가 열린다.
 */
export function OppRow({ p, week, top, mark, load, why, onOpen }: {
  p: Program; week: number; top?: boolean; mark?: string; load?: string; why?: string; onOpen: (p: Program) => void;
}) {
  const d = ddayOf(p, week);
  const gains = rowGains(p, 3);
  return (
    <li>
      <button type="button" className="rec-row" data-top={top ? 'yes' : undefined} aria-label={`${p.title}, ${CATEGORY_LABEL[categoryOf(p)]}, ${ddayText(d)}`} onClick={() => onOpen(p)}>
        <span className="rec-row__main">
          <span className="rec-row__title">{p.title}</span>
          <span className="rec-row__meta">
            <span className="rec-row__cat">{CATEGORY_LABEL[categoryOf(p)]}</span>
            {/* 부담은 빠듯할 때만 알린다. 그때는 주최 대신 써서 한 줄 정보를 둘로 둔다 */}
            <span>{load ?? plainText(p.host)}</span>
            {mark && <Badge tone="lime">{mark}</Badge>}
          </span>
          {why && <span className="rec-row__why">{why}</span>}
        </span>
        <span className="rec-row__gains" role="group" aria-label="얻는 것">
          {gains.length > 0 ? gains.map(g => <GainChip key={g.kind} kind={g.kind} label={g.label} />) : <span className="rec-muted">모집글에 적힌 것이 없어요</span>}
        </span>
        <span className={`rec-row__dday num${isNearDeadline(d) ? ' rec-row__dday--near' : ''}`}>{ddayText(d)}</span>
      </button>
    </li>
  );
}
