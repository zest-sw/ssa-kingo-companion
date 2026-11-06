import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { Badge, Button, Card, Modal, Switch, useToast } from '../../components';
import { SCHOOL_DATA } from '../../data/settings';
import { exportText } from '../../domain/exportData';
import type { Settings } from '../../domain/types';
import { Group, Row } from './Row';
import { useStartOver } from './useStartOver';

const FLAGS: { key: keyof Settings; title: string; sub: string; on: string; off: string }[] = [
  { key: 'discover', title: '회고를 발견과 추천에 쓰기', sub: '끄면 회고로 발견을 만들지 않고, 추천 이유에도 쓰지 않아요', on: '회고를 다시 발견과 추천에 써요.', off: '회고를 발견과 추천에 쓰지 않아요.' },
  { key: 'career', title: '채용 공고 요건과 연결', sub: '공개된 공고의 직무 요건과 내 기록을 이어서 보여 줘요', on: '채용 공고 연결을 켰어요.', off: '채용 공고 연결을 껐어요.' }
];

/** 데이터·개인정보. 데이터마다 '어디서 왔고 무엇에 쓰는지'를 한 줄로, 학교 데이터는 동의 안내를 거쳐서, 내보내기·지우기까지. */
export function DataSection() {
  const { state, run } = useApp();
  const startOver = useStartOver();
  const toast = useToast();
  const [school, setSchool] = useState<(typeof SCHOOL_DATA)[number] | null>(null);
  const [erase, setErase] = useState(false);

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportText(state)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'kingo-companion-내-데이터.json'; a.click();
    URL.revokeObjectURL(url);
    toast('내 데이터를 파일로 내려받았어요.');
  };
  const wipe = () => { setErase(false); startOver('이 브라우저의 내 데이터를 지웠어요. 가입 인터뷰부터 다시 해요.'); };

  return (
    <div className="st-stack">
      <Card className="st-card">
        <Group title="내가 알려 준 것" sub="추천에는 학생이 확인한 것만 써요">
          <ul className="st-rows">
            <Row title="관심 분야·시간·목표" sub="가입 인터뷰에서 받았어요. 추천 후보를 고를 때 써요" />
            {FLAGS.map(f => (
              <Row key={f.key} title={f.title} sub={f.sub}>
                <Switch hideLabel label={f.title} checked={state.settings[f.key]} onChange={next => run({ type: 'settings/toggle', key: f.key }, { toast: next ? f.on : f.off, undoable: true })} />
              </Row>
            ))}
            <Row title="기록마다 추천에 쓰기" sub="기록 카드마다 따로 켜고 꺼요">
              <Button size="sm" variant="ghost" icon="chevron" onClick={() => navigate('activities/records')}>기록</Button>
            </Row>
            <Row title="발견과 역량 근거" sub="공개해도 다른 사람에게 보이지 않아요">
              <Badge tone="neutral" icon="lock">항상 나만</Badge>
            </Row>
          </ul>
        </Group>
        <Group title="학교 데이터" sub="동의한 것만 연결해요. 언제든 끊을 수 있어요">
          <ul className="st-rows">
            {SCHOOL_DATA.map(d => (
              <Row key={d.id} title={d.title} sub={`${d.from}에서 읽어요`}>
                <Badge tone="neutral">연결 안 함</Badge>
                <Button size="sm" onClick={() => setSchool(d)}>동의 안내</Button>
              </Row>
            ))}
          </ul>
        </Group>
        <Group title="내보내기·지우기">
          <ul className="st-rows">
            <Row title="내 데이터 내려받기" sub="입력한 정보, 활동, 기록, 설정을 파일 하나로 받아요">
              <Button size="sm" icon="doc" onClick={download}>내려받기</Button>
            </Row>
            <Row title="내 데이터 지우기" sub="이 브라우저에 남긴 것을 모두 지우고 가입 인터뷰부터 다시 해요">
              <Button size="sm" onClick={() => setErase(true)}>지우기</Button>
            </Row>
          </ul>
        </Group>
      </Card>

      <Modal
        open={school !== null}
        title={school ? `${school.from} 연결 전에 확인해요` : ''}
        onClose={() => setSchool(null)}
        actions={<Button variant="primary" onClick={() => setSchool(null)}>알겠어요</Button>}
      >
        {school && (
          <ul className="st-consent">
            <li><b>읽는 것</b>{school.reads}</li>
            <li><b>쓰는 곳</b>{school.use}</li>
            <li><b>끊기</b>언제든 끊을 수 있어요. 끊으면 새로 읽지 않아요</li>
            <li><b>지금</b>프로토타입이라 실제로 연결하지는 않아요</li>
          </ul>
        )}
      </Modal>
      <Modal
        open={erase}
        title="이 브라우저의 내 데이터를 지워요"
        onClose={() => setErase(false)}
        actions={<><Button onClick={() => setErase(false)}>취소</Button><Button variant="primary" onClick={wipe}>지우기</Button></>}
      >
        프로필, 활동, 기록, 설정이 모두 지워져요. 남겨 두려면 먼저 내려받아 주세요.
      </Modal>
    </div>
  );
}
