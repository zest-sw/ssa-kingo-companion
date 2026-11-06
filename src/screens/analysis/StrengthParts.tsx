import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { Button, EmptyState, FieldTag } from '../../components';
import { ddayOf } from '../../domain/recommend';
import { isNearDeadline } from '../../domain/recommend-flow/flow';
import { DID_DOING, type Strength, type StrengthChance, type StrengthWhen } from '../../domain/analysis/strengths';
import { semesterShort } from '../../domain/analysis/visual';
import { ddayText, josa } from '../../domain/text';
import type { Axis } from '../../domain/types';

// 나의 강점 화면과 서랍이 함께 쓰는 조각.

/** 이 강점을 쓸 수 있는 기회. 카드를 누르면 기회 서랍(거기서 추천 화면으로). 신청은 학생이 추천 화면에서 직접 한다. */
export function ChanceList({ axis, label, chances }: { axis: Axis; label: string; chances: StrengthChance[] }) {
  const { state } = useApp();
  if (chances.length === 0) {
    return <EmptyState icon="compass" message={`지금 후보 중에는 ${label}${josa(label, '을', '를')} 쓰는 기회가 없어요.`} action={<Button size="sm" onClick={() => navigate('recommend')}>추천 보기</Button>} />;
  }
  return (
    <ul className="an-chances" aria-label={`${label} 쓸 수 있는 기회`}>
      {chances.map(c => (
        <li key={c.program.id}>
          <button type="button" className="an-chance" data-axis={axis} onClick={() => openEntity({ kind: 'opportunity', id: c.program.id })}>
            <b className="an-chance__title">{c.program.title}</b>
            <span className="an-chance__meta"><FieldTag field={c.program.field} /><span className="ui-dday num" data-near={isNearDeadline(ddayOf(c.program, state.week)) || undefined}>{ddayText(ddayOf(c.program, state.week))}</span></span>
            <span className="an-chance__why">{DID_DOING[c.did]} {label}{josa(label, '을', '를')} 써요</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** 언제·어디서 드러났나: 학기 칸마다 근거 점(분야 색). 한 칸 이름은 한 번만. */
export function WhenPic({ rows }: { rows: StrengthWhen[] }) {
  return (
    <span className="an-swhen" role="img" aria-label={rows.map(r => `${semesterShort(r.semester)} ${r.items.length}개`).join(', ')}>
      {rows.map(r => (
        <span key={r.semester} className="an-swhen__col">
          <span className="an-swhen__dots">{r.items.map(e => <span key={e.recordId} className={`an-swhen__dot an-g--${e.group}${e.confirmed ? '' : ' is-est'}`} />)}</span>
          <span className="an-swhen__sem">{semesterShort(r.semester)}</span>
        </span>
      ))}
    </span>
  );
}
