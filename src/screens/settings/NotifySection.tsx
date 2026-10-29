import { useApp } from '../../app/AppState';
import { Card, Icon, SegmentedControl, Switch } from '../../components';
import { NOTIFY_HOURS, NOTIFY_ITEMS } from '../../data/settings';
import type { NotifyHour } from '../../domain/types';
import { Group, Row } from './Row';

/** 알림(예시 설정). 기준 문서의 알림 예산을 켜고 끈다. 실제 발송은 없다. */
export function NotifySection() {
  const { state, run } = useApp();
  const n = state.notify;
  const anyOn = NOTIFY_ITEMS.some(i => n[i.key]);
  return (
    <div className="st-stack">
      <Card className="st-card">
        <Group title="받을 알림" sub="꼭 필요한 것만, 묶어서 보내요">
          <ul className="st-rows">
            {NOTIFY_ITEMS.map(i => (
              <Row key={i.key} title={i.title} sub={i.sub}>
                <Switch hideLabel label={`${i.title} 알림`} checked={n[i.key]} onChange={next => run({ type: 'notify/set', patch: { [i.key]: next } })} />
              </Row>
            ))}
          </ul>
        </Group>
        <Group title="받을 시각">
          <ul className="st-rows">
            <Row title="하루 한 번 이 시각에" sub={anyOn ? '활동 전날 알림도 이 시각에 와요' : '켜 둔 알림이 없어요. 위에서 하나를 켜 보세요'}>
              <SegmentedControl label="받을 시각" items={NOTIFY_HOURS} value={`${n.hour}`} onChange={id => run({ type: 'notify/set', patch: { hour: Number(id) as NotifyHour } })} />
            </Row>
          </ul>
        </Group>
      </Card>
      <p className="st-note"><Icon name="info" />프로토타입이라 실제 알림은 보내지 않아요.</p>
    </div>
  );
}
