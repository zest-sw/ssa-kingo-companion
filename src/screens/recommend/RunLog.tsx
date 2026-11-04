import { Icon } from '../../components';
import type { LogEntry } from '../../domain/recommend-flow/draft';

/** 에이전트 실행 기록(Jira 자동화 감사 로그처럼): 대신 한 일과 못 한 일. 접어 두고 누르면 연다. 신청 준비 화면과 활동 서랍이 같이 쓴다. */
/** day 는 시각 앞에 붙일 날 이름(신청 준비 화면은 '오늘'). */
export function RunLog({ log, day }: { log: LogEntry[]; day?: string }) {
  return (
    <details className="rec-runlog">
      <summary className="rec-runlog__head">에이전트가 한 일 {log.length}개</summary>
      <ul>
        {log.map((l, n) => (
          <li key={n} className={l.ok ? '' : 'rec-runlog__fail'}>
            <Icon name={l.ok ? 'check' : 'alert'} size={14} />
            <span className="num">{day ? `${day} ${l.time}` : l.time}</span>
            <span>{l.text}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
