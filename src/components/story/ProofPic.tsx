import type { ProofPic as Pic } from '../../domain/insight/story';
import { TREE_COLUMNS } from '../../domain/analysis/techtree';
import { GROUP_LABEL } from '../../domain/vocab';

/** 점은 이만큼까지만 그린다. 더 많으면 앞에서 자른다(숫자는 옆 글이 말한다) */
const MAX_DOTS = 14;

/**
 * 근거 한 칸의 작은 그림. 값은 근거 수·학기·단계 그대로이고 점수로 바꾸지 않는다.
 * 강점: 확인 근거는 채운 점, AI 추정은 점선 원. 묶음: 활동 하나 = 분야색 점. 흐름: 해마다 가장 많이 한 분야. 깊이: 입문·중급·심화 세 칸.
 */
export function ProofPic({ pic }: { pic: Pic }) {
  if (pic.kind === 'strength') {
    const solid = Math.min(pic.confirmed, MAX_DOTS);
    const dashed = Math.min(pic.total - pic.confirmed, MAX_DOTS - solid);
    return (
      <span className="ui-pp ui-pp--dots" role="img" aria-label={`확인 근거 ${pic.confirmed}개, AI 추정 ${pic.total - pic.confirmed}개`}>
        {/* 자리마다 같은 점을 두고 모양만 바꾼다. 맞아요로 확인하면 그 점이 점선에서 채운 점으로 바뀐다 */}
        {Array.from({ length: solid + dashed }, (_, i) => <i key={i} className={i < solid ? 'ui-pp__dot' : 'ui-pp__dot is-est'} />)}
      </span>
    );
  }
  if (pic.kind === 'cluster') {
    return (
      <span className="ui-pp ui-pp--dots" role="img" aria-label={`활동 ${pic.groups.length}개`}>
        {pic.groups.slice(0, MAX_DOTS).map((g, i) => <i key={i} className={`ui-pp__dot ui-pp--g-${g}`} />)}
      </span>
    );
  }
  if (pic.kind === 'flow') {
    return (
      <span className="ui-pp ui-pp--flow" role="img" aria-label={pic.steps.map(s => `${s.year} ${GROUP_LABEL[s.group]}`).join(' → ')}>
        {pic.steps.map((s, i) => (
          <span key={i} className="ui-pp__step">
            <i className={`ui-pp__bar ui-pp--g-${s.group}`} />
            <span className="ui-pp__year num">{s.year.slice(2)}</span>
          </span>
        ))}
      </span>
    );
  }
  return (
    <span className="ui-pp ui-pp--depth" role="img" aria-label={pic.stages.map((s, i) => `${TREE_COLUMNS[i]} ${s === 'done' ? '함' : s === 'skipped' ? '건너뜀' : '아직'}`).join(', ')}>
      {pic.stages.map((s, i) => <i key={i} className={`ui-pp__stage is-${s} ui-pp--g-${pic.group}`} />)}
    </span>
  );
}
