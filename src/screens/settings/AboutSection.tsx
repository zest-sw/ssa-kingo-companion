import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { Button, Card, Modal, SegmentedControl, useToast } from '../../components';
import { ABOUT_LINES, PRINCIPLE_LINES } from '../../data/settings';
import { Group, Row } from './Row';

type Mode = 'demo' | 'new';
const MODES: { id: Mode; label: string }[] = [{ id: 'demo', label: '예시 데이터로 보기' }, { id: 'new', label: '새 학생으로 시작' }];

/** 프로토타입 정보. 데이터가 예시임을 밝히는 단 한 곳이고, 예시 데이터/새 학생 전환과 처음 상태로 돌리기도 여기 있다. */
export function AboutSection() {
  const { state, run, resetAll } = useApp();
  const toast = useToast();
  const [ask, setAsk] = useState(false);
  const [askMode, setAskMode] = useState(false);
  const reset = () => { resetAll(); setAsk(false); navigate('home'); toast('처음 상태로 돌렸어요.'); };
  // 새 학생이 직접 쓴 활동·기록은 예시로 바꾸면 사라진다. 그럴 때만 한 번 묻는다.
  const mine = state.demo ? 0 : state.activities.length + state.records.length;
  const switchTo = (demo: boolean) => {
    setAskMode(false);
    run({ type: 'data/mode', demo });
    toast(demo ? '예시 학생의 활동·기록으로 보고 있어요.' : '새 학생으로 시작했어요. 추천에서 첫 활동을 골라 보세요.');
  };
  const choose = (m: Mode) => {
    if ((m === 'demo') === state.demo) return;
    if (m === 'demo' && mine > 0) setAskMode(true); else switchTo(m === 'demo');
  };
  return (
    <div className="st-stack">
      <Card className="st-card">
        <Group title="킹고 컴패니언 데스크톱 웹 프로토타입">
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
            <Row title="보는 데이터" sub={state.demo ? '예시 학생의 활동·기록·친구로 둘러보는 중이에요' : '새 학생이에요. 활동·기록이 비어 있고 기회만 있어요'}>
              <SegmentedControl label="보는 데이터" items={MODES} value={state.demo ? 'demo' : 'new'} onChange={choose} />
            </Row>
            <Row title="처음 상태로 돌리기" sub="프로필, 고른 것, 초안, 설정을 지우고 가입 인터뷰부터 다시 해요">
              <Button onClick={() => setAsk(true)}>처음 상태로 돌리기</Button>
            </Row>
          </ul>
        </Group>
      </Card>
      <Modal
        open={ask}
        title="처음 상태로 돌릴까요?"
        onClose={() => setAsk(false)}
        actions={<><Button onClick={() => setAsk(false)}>취소</Button><Button variant="primary" onClick={reset}>돌리기</Button></>}
      >
        이 브라우저에 남긴 프로필, 고른 것, 초안, 설정도 지워져요.
      </Modal>
      <Modal
        open={askMode}
        title="예시 데이터로 바꿀까요?"
        onClose={() => setAskMode(false)}
        actions={<><Button onClick={() => setAskMode(false)}>취소</Button><Button variant="primary" onClick={() => switchTo(true)}>바꾸기</Button></>}
      >
        새 학생으로 쓴 활동·기록 {mine}개가 지워져요.
      </Modal>
    </div>
  );
}
