import { Button, EmptyState, FieldTag, GhostPic, PageHeader } from '../../components';
import { parentLink } from '../../app/router';
import { useApp } from '../../app/AppState';
import { BUNDLE_MAX, BUNDLE_MIN, bundleText } from '../../domain/interview/answer';
import { semesterLabel } from '../../domain/interview/archive';
import { cardOf } from '../../domain/interview/record';
import { StarFields, useCopy } from './ExperienceCard';
import { readPicks } from './portfolioPicks';
import { VerificationBadge } from './RecordCardView';
import './portfolio.css';

/**
 * 기록 › 경험 카드 묶음: 보관함에서 고른 2~5개를 면접·서류용 경험 카드로 한 화면에 모은다. 인쇄·복사만 하고 어디에도 내지 않는다.
 * 고른 순서대로 보여 준다(학생이 말하고 싶은 순서).
 */
export function Portfolio() {
  const { state } = useApp();
  const copy = useCopy();
  const picked = readPicks().map(id => state.records.find(r => r.id === id)).filter(r => r !== undefined);
  const ready = picked.length >= BUNDLE_MIN;

  return (
    <div className="os pf">
      <PageHeader
        parent={parentLink('activities/records')}
        crumb="경험 카드 묶음"
        title={ready ? `경험 카드 ${picked.length}장` : '경험 카드 묶음'}
        actions={ready && (
          <>
            <Button onClick={() => window.print()}>인쇄</Button>
            <Button variant="primary" icon="doc" onClick={() => copy(bundleText(picked), `경험 카드 ${picked.length}장을 복사했어요.`)}>전체 복사</Button>
          </>
        )}
      />
      {ready ? (
        <div className="os__body os__body--fill pf__body">
          <ol className="pf__grid os-scroll" data-fill>
            {picked.map(r => (
              <li key={r.id} className="pf-card">
                <header className="pf-card__head">
                  <h2 className="pf-card__title">{r.title}</h2>
                  <p className="pf-card__meta"><FieldTag field={r.field} /><span>{semesterLabel(r.semester)} · {r.kind}</span><VerificationBadge v={r.verification} /></p>
                </header>
                <StarFields card={cardOf(r)} compact />
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="pf__empty">
          {/* 기록으로 돌아가는 길은 빵부스러기가 맡는다(진입점 하나) */}
          <EmptyState pic={<GhostPic kind="rows" labels={['', '']} />} message={`보관함에서 기록 ${BUNDLE_MIN}~${BUNDLE_MAX}개를 고르면 경험 카드 묶음이 생겨요.`} />
        </div>
      )}
    </div>
  );
}
