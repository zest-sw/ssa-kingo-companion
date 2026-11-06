import type { ReactNode } from 'react';
import type { NextPick } from '../../domain/insight/story';
import { Button } from '../Button';
import { AiMark } from '../AiMark';
import { Icon } from '../Icon';

type Props = {
  next: NextPick;
  /** 이 후보 자세히 주소 */
  href: string;
  /** 분야·마감 같은 작은 사실 한 줄 */
  meta?: ReactNode;
  onPrepare: () => void;
  /** '다른 대안' 한 줄 링크(홈에서만) */
  more?: { href: string; label: string };
};

/** 그래서 이번 주: 이야기에서 고른 후보 하나 + 이야기 말로 된 이유 + 신청 준비(학생이 직접 누른다). */
export function NextStep({ next, href, meta, onPrepare, more }: Props) {
  return (
    <section className="ui-story-next" aria-labelledby="ui-story-next-h">
      <p id="ui-story-next-h" className="ui-story-next__eyebrow">그래서 이번 주</p>
      <div className="ui-story-next__row">
        <div className="ui-story-next__main">
          <a className="ui-story-next__title" href={href}>{next.title}</a>
          <p className="ui-story-next__why"><span>{next.why}</span><AiMark /></p>
          {meta && <p className="ui-story-next__meta">{meta}</p>}
          {next.note && <p className="ui-story-next__note">{next.note}</p>}
        </div>
        <Button variant="primary" onClick={onPrepare}>신청 준비</Button>
      </div>
      {more && <a className="ui-story-next__more" href={more.href}>{more.label}<Icon name="chevron" size={14} /></a>}
    </section>
  );
}
