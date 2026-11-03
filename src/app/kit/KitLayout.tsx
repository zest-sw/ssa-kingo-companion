import { useState } from 'react';
import { Badge, Button, Card, FieldTag, Icon, Panel, Stepper } from '../../components';

const STEPS = [
  { id: 'pick', label: '고르기' }, { id: 'detail', label: '자세히' }, { id: 'prepare', label: '준비' }, { id: 'apply', label: '신청' }
] as const;
type Step = (typeof STEPS)[number]['id'];
const ROWS = ['AI 데이터 분석 경진대회', '사용자 인터뷰 실습 워크숍', '현직 UX 리서처 커리어 토크', '창업 아이디어 피칭 데이', '포트폴리오 1:1 피드백', '설문 결과로 말하기', '경험을 문장으로'];

/** v1.4 틀 부품 예시: 칸 안 스크롤(가장자리 그림자), 패널(머리/내용/행동 막대), 단계 표시, 높이별 밀도 */
export function KitLayout() {
  const [step, setStep] = useState<Step>('prepare');
  const at = STEPS.findIndex(s => s.id === step);
  return (
    <Card className="kit-section" title="틀: 스크롤 칸 · Panel · Stepper" action={<code className="kit-code">{'<Panel footer={…}> · <Stepper current onStep> · .os-scroll'}</code>}>
      <div className="kit-layout">
        <div className="kit-cell">
          <span className="kit-label">.os-scroll (얇은 스크롤바, 위·아래 그림자)</span>
          <ul className="kit-scrollbox os-scroll" aria-label="스크롤 칸 예시">
            {ROWS.concat(ROWS).map((r, i) => <li key={i}><FieldTag field={i % 2 ? 'ai' : 'dev'} /> {r}</li>)}
          </ul>
        </div>
        <div className="kit-cell">
          <span className="kit-label">Panel: 행동 막대가 내용을 덮지 않아요</span>
          <Panel className="kit-panel" eyebrow="고른 후보" title="AI 데이터 분석 경진대회" action={<Badge tone="lime">가장 추천</Badge>}
            footer={<><Button variant="primary">신청 준비</Button><Button>나중에 보기</Button></>}
            note={<><Icon name="lock" size={14} />내가 누를 때만 나가요</>}>
            <p className="kit-muted">내용 칸만 스크롤하고 머리와 행동 막대는 제자리예요. 부모가 높이를 정해 줘야 해요.</p>
            {ROWS.map(r => <p key={r} className="kit-muted">· {r}</p>)}
          </Panel>
        </div>
        <div className="kit-cell kit-span">
          <span className="kit-label">Stepper: 지난 단계를 누르면 돌아가요(지금 {at + 1}단계)</span>
          <Stepper label="신청 단계" steps={[...STEPS]} current={step} onStep={setStep} />
          <div className="kit-row">
            <Button size="sm" disabled={at === 0} onClick={() => setStep(STEPS[Math.max(0, at - 1)].id)}>이전</Button>
            <Button size="sm" variant="primary" disabled={at === STEPS.length - 1} onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, at + 1)].id)}>다음</Button>
          </div>
          <p className="kit-muted">높이 760 아래에서는 머리·카드 여백·큰 글자·메뉴 줄이 한 단계 줄어요(--card-pad, --main-pad-*, --text-lg~4xl). 보조 줄은 .only-tall 로 낮은 높이에서 숨겨요.</p>
        </div>
      </div>
    </Card>
  );
}
