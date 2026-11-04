import type { Gap, ScreenLine } from '../../domain/insight/story';

/** 이야기에서 비어 있는 한 곳. 경고색 없이 회색 점선 표시 하나와 한 줄(회색 점선 = 아직 안 한 것) */
export function GapLine({ gap }: { gap: Gap }) {
  return (
    <p className="ui-story-gap">
      <span className="ui-story-gap__mark" aria-hidden="true" />
      <b>비어 있는 곳</b>
      <span>{gap.line}</span>
    </p>
  );
}

/** 하위 분석 화면 머리 한 줄: 그래서(해석) · 이제(행동). 요약으로 가는 길은 구역 탭 '한눈에' 하나라 링크를 두지 않는다 */
export function StoryNote({ line }: { line: ScreenLine }) {
  return (
    <p className="ui-story-note">
      <span className="ui-story-note__so">{line.soWhat}</span>
      {line.nowWhat && <span className="ui-story-note__now">{line.nowWhat}</span>}
    </p>
  );
}
