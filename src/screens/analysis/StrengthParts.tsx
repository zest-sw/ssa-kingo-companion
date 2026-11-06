import { useApp } from '../../app/AppState';
import { openEntity } from '../../app/entity';
import { navigate } from '../../app/router';
import { Button, EmptyState, FieldTag } from '../../components';
import { ddayOf } from '../../domain/recommend';
import { DID_DOING, type Strength, type StrengthChance, type StrengthWhen } from '../../domain/analysis/strengths';
import { semesterShort } from '../../domain/analysis/visual';
import { ddayText, josa } from '../../domain/text';
import type { Axis } from '../../domain/types';

// 나의 강점 화면과 서랍이 함께 쓰는 조각.

/** 한 줄에 그리는 점 수 상한. 넘으면 '+n'. */
// ponytail: 근거가 아주 많은 학생(10개 넘게)은 점 대신 막대로 바꿀지 아직 정하지 않았다. 실제 기록 분포를 보고 정한다.
export const DOTS_MAX = 8;

/** 기록 하나 = 점 하나. 확인한 근거는 채운 점, AI 추정은 옅은 점선 점. 점수가 아니라 실제 개수다. */
export function EvidenceDots({ strength }: { strength: Strength }) {
  const n = strength.evidence.length;
  const shown = strength.evidence.slice(0, DOTS_MAX);
  const estimated = n - strength.confirmed;
  return (
    <span className="an-sdots" role="img" aria-label={`근거 기록 ${n}개, 확인 ${strength.confirmed}개${estimated ? `, AI 추정 ${estimated}개` : ''}`}>
      <span className="an-sdots__set">{shown.map(e => <span key={e.recordId} className={`ui-dot ui-dot--${e.confirmed ? 'confirmed' : 'estimated'}`} />)}</span>
      <span className="an-sdots__n">{n > DOTS_MAX ? `+${n - DOTS_MAX}` : `${n}개`}</span>
    </span>
  );
}

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
            <span className="an-chance__meta"><FieldTag field={c.program.field} /><span>{ddayText(ddayOf(c.program, state.week))}</span></span>
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
