import { useState, type ReactNode } from 'react';
import {
  Badge, Button, Card, Chip, ConfirmDot, ConfirmLegend, CountBadge, Drawer, EmptyState, ErrorState, FieldTag, Icon, ICON_NAMES, IconButton,
  LoadingState, Modal, PageHeader, ProgressBar, SegmentedControl, Stat, Switch, TabPanel, Tabs, Toast, useToast
} from '../../components';
import type { Field } from '../../domain/types';
import { useApp } from '../AppState';
import { navigate, type ScreenProps } from '../router';
import './kit.css';

const LONG = '아주 긴 활동 이름이 들어와도 카드 밖으로 넘치지 않고 줄을 바꿔야 해요: 2026 하계 글로벌 소프트웨어 융합 리더십 집중 캠프 및 산학 협력 프로젝트 발표회';
const FIELDS: Field[] = ['dev', 'ai', 'startup', 'mentor', 'global', 'career'];
const TABS = [{ id: 'techtree', label: '테크 트리' }, { id: 'map', label: '경험 지도', count: 2 }, { id: 'flow', label: '관심 흐름' }];

function Section({ title, usage, children }: { title: string; usage: string; children: ReactNode }) {
  return (
    <Card className="kit-section" title={title} action={<code className="kit-code">{usage}</code>}>
      <div className="kit-row">{children}</div>
    </Card>
  );
}
const Cell = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="kit-cell"><span className="kit-label">{label}</span>{children}</div>
);

/** 공용 컴포넌트 목록(#/_kit). 화면 워커가 쓰는 법을 여기서 본다. 사이드바에는 없다. */
export default function KitScreen({ sub }: ScreenProps) {
  const toast = useToast();
  const { state, view, run } = useApp();
  const [chip, setChip] = useState('data');
  const [seg, setSeg] = useState<'board' | 'list'>('board');
  const tab = TABS.some(t => t.id === sub) ? sub! : 'techtree';
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState(false);
  const [retry, setRetry] = useState(0);
  const [on, setOn] = useState(true);

  return (
    <div className="kit">
      <PageHeader eyebrow="개발용 · #/_kit" title="컴포넌트 목록" actions={<><Button variant="ghost" onClick={() => navigate('home')}>홈으로</Button><Button variant="primary" icon="pencil">주요 행동</Button></>} />

      <Section title="Button" usage="<Button variant='primary' icon='pencil'>">
        <Cell label="primary"><Button variant="primary">신청 준비</Button></Cell>
        <Cell label="secondary"><Button>나중에 보기</Button></Cell>
        <Cell label="ghost"><Button variant="ghost">관심 없음</Button></Cell>
        <Cell label="아이콘"><Button variant="primary" icon="pencil">회고 쓰기</Button></Cell>
        <Cell label="sm"><Button size="sm" icon="refresh">다시 시도</Button></Cell>
        <Cell label="비활성"><Button variant="primary" disabled>이대로 신청</Button></Cell>
        <Cell label="IconButton"><IconButton icon="x" label="닫기" /></Cell>
        <Cell label="block · 긴 글"><div className="kit-narrow"><Button variant="primary" block>남은 준비를 끝내면 열려요</Button></div></Cell>
      </Section>

      <Section title="Chip" usage="<Chip selected={on} onClick>">
        {['data', 'ai', 'plan'].map(id => <Chip key={id} selected={chip === id} onClick={() => setChip(id)}>{id === 'data' ? '데이터' : id === 'ai' ? 'AI' : '서비스 기획'}</Chip>)}
        <Chip icon="check">아이콘</Chip>
        <Chip disabled>비활성</Chip>
      </Section>

      <Section title="Switch" usage="<Switch checked={on} onChange={setOn} label='프로필에 전시' />">
        <Cell label="라벨"><Switch checked={on} onChange={setOn} label="프로필에 전시" /></Cell>
        <Cell label="hideLabel"><Switch hideLabel checked={!on} onChange={next => setOn(!next)} label="프로필 공개" /></Cell>
      </Section>

      <Section title="Badge · CountBadge" usage="<Badge tone='navy'>신청 준비</Badge>">
        <Badge tone="navy">신청 준비</Badge>
        <Badge>결과 대기</Badge>
        <Badge tone="green">진행 중</Badge>
        <Badge tone="orange">회고 대기</Badge>
        <Badge>이번엔 안 됨</Badge>
        <Badge tone="lime">가장 추천</Badge>
        <Badge tone="solid-orange">오늘</Badge>
        <Badge tone="dashed">AI 추정</Badge>
        <Badge tone="green" icon="check">신청 대상 맞음</Badge>
        <CountBadge count={3} label="새 후보" />
        <Cell label="0이면 안 그림"><CountBadge count={0} label="새 후보" /></Cell>
      </Section>

      <Section title="FieldTag" usage="<FieldTag field={p.field} />">
        {FIELDS.map(f => <FieldTag key={f} field={f} />)}
        <Cell label="detail"><FieldTag field="research" detail /></Cell>
      </Section>

      <Section title="ConfirmDot" usage="<ConfirmDot state='estimated' />">
        <Cell label="확인"><ConfirmDot state="confirmed" /></Cell>
        <Cell label="AI 추정"><ConfirmDot state="estimated" /></Cell>
        <Cell label="범례"><ConfirmLegend /></Cell>
      </Section>

      <Section title="ProgressBar" usage="<ProgressBar value={2} max={3} label='준비' />">
        <div className="kit-narrow"><ProgressBar value={2} max={3} label="준비 진행도" /></div>
        <div className="kit-narrow"><ProgressBar value={2} max={3} label="도전 과제 진행도" showText /></div>
        <Cell label="0"><div className="kit-narrow"><ProgressBar value={0} max={3} label="빈 진행도" showText /></div></Cell>
      </Section>

      <Section title="Stat" usage="<Stat label='이번 학기 활동' value={4} unit='개' />">
        <Card padding="md" className="kit-stat"><Stat label="이번 학기 활동" value={4} unit="개" /></Card>
        <Card padding="md" className="kit-stat"><Stat label="회고 대기" value={1} unit="개" tone="accent" /></Card>
        <Card padding="md" tone="alt" className="kit-stat"><Stat label="마감" value="D-3" tone="accent" sub="10월 15일" /></Card>
        <Card padding="md" className="kit-stat"><Stat label="새 추천" value={view.newCount} unit="개" sub="전역 상태에서 읽은 값" /></Card>
      </Section>

      <Section title="Tabs · SegmentedControl" usage="<Tabs value={sub} onChange={id => navigate(`analysis/${id}`)}>">
        <div className="kit-col">
          <Tabs id="kit-tabs" label="분석 보기" items={TABS} value={tab} onChange={id => navigate(`_kit/${id}`, { replace: true })} />
          <TabPanel id="kit-tabs" active={tab}><p className="kit-muted">지금 하위 경로: <code>#/_kit/{tab}</code>. 화살표 키로 탭을 옮겨요.</p></TabPanel>
        </div>
        <SegmentedControl label="보기 방식" items={[{ id: 'board', label: '보드' }, { id: 'list', label: '목록' }]} value={seg} onChange={setSeg} />
      </Section>

      <Section title="Card" usage="<Card title='역량 근거' action={<ConfirmLegend />}>">
        <Card title="역량 근거" action={<ConfirmLegend />} className="kit-card"><p className="kit-muted">흰 바탕, 1px 선, 반지름 6, 그림자 없음.</p></Card>
        <Card tone="alt" padding="md" className="kit-card"><p className="kit-muted">tone="alt" · padding="md"</p></Card>
        <Card padding="md" className="kit-card" title={LONG}><FieldTag field="global" /></Card>
      </Section>

      <Section title="EmptyState · ErrorState · LoadingState" usage="<EmptyState message='…해 보세요.' action={…} />">
        <Card padding="md" className="kit-card"><EmptyState message="아직 회고 대기 활동이 없어요. 끝난 활동이 생기면 여기서 바로 회고를 쓸 수 있어요." action={<Button size="sm" onClick={() => navigate('recommend')}>추천 보기</Button>} /></Card>
        <Card padding="md" className="kit-card"><ErrorState onRetry={() => { setRetry(n => n + 1); toast(`다시 시도했어요 (${retry + 1})`); }} /></Card>
        <Card padding="md" className="kit-card"><LoadingState message="신청서 초안을 쓰는 중이에요" /></Card>
      </Section>

      <Section title="Drawer · Modal · Toast" usage="const toast = useToast(); run(action, { toast, undoable: true })">
        <Button onClick={() => setDrawer(true)}>서랍 열기</Button>
        <Button onClick={() => setModal(true)}>모달 열기</Button>
        <Button onClick={() => toast('일정에 담았어요.')}>토스트</Button>
        <Button onClick={() => run({ type: 'settings/toggle', key: 'career' }, { toast: state.settings.career ? '채용 공고 연결을 껐어요.' : '채용 공고 연결을 켰어요.', undoable: true })}>
          되돌리기 토스트 (채용 연결 {state.settings.career ? '켜짐' : '꺼짐'})
        </Button>
        <Cell label="정적"><Toast message="관심 없음으로 뺐어요." onUndo={() => undefined} /></Cell>
      </Section>

      <Section title="Icon" usage="<Icon name='calendar' size={20} />">
        {ICON_NAMES.map(n => <span key={n} className="kit-icon" title={n}><Icon name={n} /><span>{n}</span></span>)}
      </Section>

      <Drawer open={drawer} title="AI 데이터 분석 경진대회" eyebrow="모집글 원문" onClose={() => setDrawer(false)} footer={<><Button onClick={() => setDrawer(false)}>닫기</Button><Button variant="primary">신청 준비</Button></>}>
        <p className="kit-muted readable">상세는 오른쪽 서랍(480px)에 열어요. ESC 나 바깥을 누르면 닫히고, 연 버튼으로 포커스가 돌아가요. {LONG}</p>
      </Drawer>
      <Modal open={modal} title="이 기록을 지울까요?" onClose={() => setModal(false)} actions={<><Button onClick={() => setModal(false)}>취소</Button><Button variant="primary" onClick={() => { setModal(false); toast('지웠어요.', { onUndo: () => toast('되돌렸어요.') }); }}>지우기</Button></>}>
        이 기록에서 나온 발견 근거도 함께 빠져요.
      </Modal>
    </div>
  );
}
