import { useState } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { Button, Card, Modal, useToast } from '../../components';
import { ABOUT_LINES } from '../../data/settings';
import { Group, Row } from './Row';

/** 프로토타입 정보. 데이터가 예시임을 밝히는 단 한 곳이고, 처음 상태로 돌리기도 여기 있다. */
export function AboutSection() {
  const { resetAll } = useApp();
  const toast = useToast();
  const [ask, setAsk] = useState(false);
  const reset = () => { resetAll(); setAsk(false); navigate('home'); toast('처음 상태로 돌렸어요.'); };
  return (
    <div className="st-stack">
      <Card className="st-card">
        <Group title="킹고 컴패니언 데스크톱 웹 프로토타입">
          <ul className="st-about">
            {ABOUT_LINES.map(line => <li key={line}>{line}</li>)}
          </ul>
        </Group>
        <Group title="이 브라우저에 남긴 것">
          <ul className="st-rows">
            <Row title="처음 상태로 돌리기" sub="프로필, 고른 것, 초안, 설정을 지우고 예시 상태로 돌아가요">
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
    </div>
  );
}
