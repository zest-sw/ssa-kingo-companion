import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { Badge, Button, Card, Switch } from '../../components';
import type { Settings } from '../../domain/types';
import { Group, Row } from './Row';

const FLAGS: { key: keyof Settings; title: string; sub: string; on: string; off: string }[] = [
  { key: 'discover', title: '회고를 발견과 추천에 쓰기', sub: '끄면 회고에서 발견을 만들지 않고, 추천 이유에도 기록을 쓰지 않아요', on: '회고를 다시 발견과 추천에 써요.', off: '회고를 발견과 추천에 쓰지 않아요.' },
  { key: 'career', title: '채용 공고 요건과 연결', sub: '관심 직무 공고의 요건과 내 기록을 이어서 보여 줘요', on: '채용 공고 연결을 켰어요.', off: '채용 공고 연결을 껐어요.' }
];

/** 데이터·개인정보. 기록 한 장에 붙은 '추천에 쓰기'는 기록 카드에 그대로 둔다. */
export function DataSection() {
  const { state, run } = useApp();
  return (
    <div className="st-stack">
      <Card className="st-card">
        <Group title="내 기록 쓰기" sub="학생이 확인한 것만 추천에 써요">
          <ul className="st-rows">
            {FLAGS.map(f => (
              <Row key={f.key} title={f.title} sub={f.sub}>
                <Switch hideLabel label={f.title} checked={state.settings[f.key]} onChange={next => run({ type: 'settings/toggle', key: f.key }, { toast: next ? f.on : f.off, undoable: true })} />
              </Row>
            ))}
            <Row title="기록마다 추천에 쓰기" sub="기록 카드마다 따로 고를 수 있어요">
              <Button size="sm" variant="ghost" icon="chevron" onClick={() => navigate('records/archive')}>기록 보관함</Button>
            </Row>
          </ul>
        </Group>
        <Group title="학교 데이터">
          <ul className="st-rows">
            <Row title="챌린지스퀘어 신청 내역" sub="연결되면 신청·참여·수료를 에이전트가 먼저 채워요">
              <Badge tone="dashed">아직 연결 안 됨</Badge>
            </Row>
            <Row title="비교과 이수 기록" sub="연결되면 기록 보관함에 '학교 확인'으로 들어와요">
              <Badge tone="dashed">아직 연결 안 됨</Badge>
            </Row>
          </ul>
        </Group>
        <Group title="항상 나만 보는 것">
          <ul className="st-rows">
            <Row title="발견과 역량 근거" sub="공개 범위와 상관없이 다른 사람에게 보이지 않아요">
              <Badge tone="dashed" icon="lock">항상 나만</Badge>
            </Row>
          </ul>
        </Group>
      </Card>
    </div>
  );
}
