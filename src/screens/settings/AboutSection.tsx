import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { Button, Card, Modal, useToast } from '../../components';
import { ABOUT_LINES, PRINCIPLE_LINES } from '../../data/settings';
import { Group, Row } from './Row';

/** 프로토타입 정보. 데이터가 예시임을 밝히는 단 한 곳이고, 예시 학생으로 보기와 처음부터 다시(새 학생)도 여기 있다. */
export function AboutSection() {
  const { state, run, resetAll } = useApp();
  const toast = useToast();
  const [ask, setAsk] = useState(false);
  const [askMode, setAskMode] = useState(false);
  const reset = () => { resetAll(); setAsk(false); navigate('home'); toast('처음부터 다시 시작해요'); };
  // 지금 상태를 예시로 덮기 전에 한 번 묻는다. 무엇이 사라지는지 말한다.
  const mine = state.demo ? 0 : state.activities.length + state.records.length;
  const overwrite = state.demo
    ? '둘러보며 고른 것과 답한 것이 처음 예시로 돌아가요.'
    : mine > 0 ? `새 학생으로 쓴 활동·기록 ${mine}개가 지워져요.` : '지금 고른 것과 답한 것이 예시 학생 것으로 바뀌어요.';
  const toExample = () => {
    setAskMode(false);
    run({ type: 'data/mode', demo: true });
    toast('예시 학생으로 바꿨어요. 3년 치 활동과 기록이 있어요');
  };
  return (
    <div className="st-stack">
      <Card className="st-card">
        <Group title="이 프로토타입은">
          <ul className="st-about">
            {ABOUT_LINES.map(line => <li key={line}>{line}</li>)}
          </ul>
        </Group>
        <Group title="이 서비스가 지키는 것">
          <ul className="st-about">
            {PRINCIPLE_LINES.map(line => <li key={line}>{line}</li>)}
          </ul>
        </Group>
        <Group title="이 브라우저에 남긴 것">
          <ul className="st-rows">
            <Row title="예시 학생으로 보기" sub={state.demo ? '지금 예시 학생으로 보고 있어요. 누르면 처음 예시로 돌아가요' : '소프트웨어학과 3학년 예시 학생의 3년 치 기록으로 바꿔요'}>
              <Button onClick={() => setAskMode(true)}>예시 학생으로 보기</Button>
            </Row>
            <Row title="처음부터 다시(새 학생)" sub="프로필, 고른 것, 초안, 설정을 지우고 가입 인터뷰부터 다시 해요">
              <Button onClick={() => setAsk(true)}>처음부터 다시</Button>
            </Row>
          </ul>
        </Group>
      </Card>
      <Modal
        open={ask}
        title="처음부터 다시 시작해요"
        onClose={() => setAsk(false)}
        actions={<><Button onClick={() => setAsk(false)}>취소</Button><Button variant="primary" onClick={reset}>다시 시작</Button></>}
      >
        이 브라우저에 남긴 프로필, 고른 것, 초안, 설정이 지워져요.
      </Modal>
      <Modal
        open={askMode}
        title="예시 학생으로 바꿔요"
        onClose={() => setAskMode(false)}
        actions={<><Button onClick={() => setAskMode(false)}>취소</Button><Button variant="primary" onClick={toExample}>바꾸기</Button></>}
      >
        {overwrite}
      </Modal>
    </div>
  );
}
