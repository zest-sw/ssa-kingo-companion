import { useState } from 'react';
import { Button, Drawer, Modal, useToast } from '../components';
import { useApp } from './AppState';
import { navigate } from './router';

/** 데이터가 예시임을 밝히는 단 한 곳. 다른 화면에는 '예시' 안내를 따로 두지 않는다. */
export function PrototypeInfo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { resetAll } = useApp();
  const toast = useToast();
  const [ask, setAsk] = useState(false);
  return (
    <>
      <Drawer open={open && !ask} title="프로토타입 정보" onClose={onClose} footer={<Button onClick={() => setAsk(true)}>처음 상태로 돌리기</Button>}>
        <div className="app-info">
          <p>킹고 컴패니언 데스크톱 웹 프로토타입이에요.</p>
          <ul>
            <li>모든 활동, 기록, 학생 정보는 예시예요. 실제 학생 데이터가 아니에요.</li>
            <li>실제 AI, 학교 API, 챌린지스퀘어 연동은 없어요. 신청은 언제나 학생이 직접 해요.</li>
            <li>새로고침하면 예시 상태로 돌아가요. 프로필, 공개 설정, 추천에서 고른 것, 신청 준비, 쓰던 회고 초안, 분석에서 답한 것만 이 브라우저에 남아요.</li>
            <li>추천 후보 개수, 역량 체계, 보드 상태 이름, 테크 트리 기준은 아직 정하지 않은 예시 값이에요.</li>
            <li>채용 공고 요건은 2026.10.08 확인한 공개 공고 3건이고 직무 참고용이에요.</li>
          </ul>
        </div>
      </Drawer>
      <Modal
        open={ask}
        title="처음 상태로 돌릴까요?"
        onClose={() => setAsk(false)}
        actions={<>
          <Button onClick={() => setAsk(false)}>취소</Button>
          <Button variant="primary" onClick={() => { resetAll(); setAsk(false); onClose(); navigate('home'); toast('처음 상태로 돌렸어요.'); }}>돌리기</Button>
        </>}
      >
        이 브라우저에 남긴 프로필, 고른 것, 초안도 지워져요.
      </Modal>
    </>
  );
}
