import { Icon } from '../../components';
import type { LogEntry } from '../../domain/recommend-flow/draft';

/**
 * 에이전트 실행 기록(Jira 자동화 감사 로그처럼): 대신 한 일과 못 한 일. 접어 두고 누르면 연다. 신청 준비 화면과 활동 서랍이 같이 쓴다.
 * day 는 시각 앞에 붙일 날 이름(신청 준비 화면은 '오늘'). summary 를 주면 접힌 줄이 그 한 줄 요약이 되고, warn 은 그 옆에 주황으로 짚는다.
 */
export function RunLog({ log, day, summary, warn }: { log: LogEntry[]; day?: string; summary?: string; warn?: string }) {
  return (
    <details className={`rec-runlog${summary ? ' rec-runlog--top' : ''}`}>
      <summary className="rec-runlog__head">
        <Icon name="chevron" size={14} />
        <span>{summary ?? `에이전트가 한 일 ${log.length}개`}</span>
        {warn && <span className="rec-runlog__warn"><Icon name="alert" size={14} />{warn}</span>}
      </summary>
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
