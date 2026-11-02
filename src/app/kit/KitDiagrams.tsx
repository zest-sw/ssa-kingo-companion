import type { ReactNode } from 'react';
import { Button, Card, CountBadge, DotGrid, Funnel, GanttRows, Legend, Loop, MiniTile, SegmentBar, Timeline, type LegendItem } from '../../components';
import { openEntity } from '../entity';
import { navigate } from '../router';
import { useOverviewState } from '../useOverviewState';
import * as D from './kitData';

const STATES = ['기본', '빈 데이터', '아주 긴 라벨', '많은 항목'] as const;

function DgSection({ title, usage, legend, states = STATES, children }: { title: string; usage: string; legend?: LegendItem[]; states?: readonly string[]; children: ReactNode[] }) {
  return (
    <Card className="kit-section" title={title} action={<code className="kit-code">{usage}</code>}>
      {legend && <Legend items={legend} />}
      <div className="kit-dg">
        {children.map((c, i) => (
          <div key={states[i]} className="kit-dg__cell">
            <span className="kit-label">{states[i]}</span>
            {c}
          </div>
        ))}
      </div>
    </Card>
  );
}

const TL_LEGEND: LegendItem[] = [
  { label: '마감', mark: 'diamond', tone: 'accent' }, { label: '활동 날짜', mark: 'dot', tone: 'ai' }, { label: '회고 대기', mark: 'ring', tone: 'mentor' }, { label: '오늘', mark: 'today' }
];
const GANTT_LEGEND: LegendItem[] = [
  { label: '준비', mark: 'hatch', tone: 'dev' }, { label: '진행', mark: 'fill', tone: 'dev' }, { label: '끝', mark: 'faded', tone: 'dev' },
  { label: '신청 마감', mark: 'diamond', tone: 'ink' }, { label: '결과 발표', mark: 'circle', tone: 'ink' }, { label: '오늘', mark: 'today' }
];
const GRID_LEGEND: LegendItem[] = [{ label: '학교 확인', mark: 'dot', tone: 'plan' }, { label: '직접 입력', mark: 'ring', tone: 'plan' }];

/** 막대 몇 개로 그린 작은 그림(MiniTile 슬롯 예시). 누르는 요소는 두지 않는다. */
const Pic = ({ bars }: { bars: number[] }) => (
  <span className="kit-pic">{bars.map((h, i) => <span key={i} style={{ height: `${h}%` }} />)}</span>
);

/** 다이어그램 부품 목록. 조각을 누르면 '마지막 선택'에 값이 뜬다(키보드 Tab·Enter·Space 로도). */
export function KitDiagrams() {
  // 상태 보존 훅 시연: L2 머리 보기로 갔다가 돌아오면 마지막 선택과 스크롤이 그대로다.
  const [last, setLast] = useOverviewState('_kit', '');
  const pick = (what: string) => (id: string, part?: string) => setLast(`${what} · ${id}${part ? ` · ${part}` : ''}`);

  return (
    <>
      <Card className="kit-section kit-dg-status" title="다이어그램 · 이동 틀" action={<code className="kit-code">import {'{ Timeline, … }'} from '../../components'</code>}>
        <div className="kit-row">
          <p className="kit-muted" aria-live="polite">마지막 선택: <b>{last || '아직 없어요. 아래 그림의 조각을 눌러 보세요.'}</b></p>
          <Button size="sm" icon="chevron" onClick={() => navigate('_kit/detail')}>L2 머리 보기</Button>
          <Button size="sm" onClick={() => openEntity({ kind: 'opportunity', id: 'p-interview' })}>기회 서랍</Button>
          <Button size="sm" onClick={() => openEntity({ kind: 'activity', id: 'a-swm' })}>활동 서랍</Button>
          <Button size="sm" onClick={() => openEntity({ kind: 'record', id: 'e4' })}>기록 서랍</Button>
          <Button size="sm" variant="ghost" onClick={() => openEntity({ kind: 'record', id: 'nope' })}>없는 항목</Button>
        </div>
      </Card>

      <DgSection title="Timeline" usage="<Timeline range today items onSelect empty label />" legend={TL_LEGEND}>
        <Timeline label="곧 있어요" range={D.RANGE_14} today={D.TODAY} items={D.TIMELINE} onSelect={pick('timeline')} empty="" />
        <Timeline label="빈 타임라인" range={D.RANGE_14} today={D.TODAY} items={[]} onSelect={pick('timeline')} empty="2주 안에 잡힌 일정이 없어요. 추천에서 하나 골라 보세요." />
        <Timeline label="긴 라벨" range={D.RANGE_14} today={D.TODAY} items={D.TIMELINE_LONG} onSelect={pick('timeline')} empty="" />
        <Timeline label="많은 항목" range={D.RANGE_14} today={D.TODAY} items={D.TIMELINE_MANY} onSelect={pick('timeline')} empty="" />
      </DgSection>

      <DgSection title="GanttRows" usage="<GanttRows range today rows onSelect={(id, part) => …} empty label />" legend={GANTT_LEGEND}>
        <GanttRows label="이번 학기 활동" range={D.SEMESTER} today={D.TODAY} rows={D.GANTT} onSelect={pick('gantt')} empty="" />
        <GanttRows label="빈 간트" range={D.SEMESTER} today={D.TODAY} rows={[]} onSelect={pick('gantt')} empty="이번 학기 활동이 아직 없어요. 추천에서 신청 준비를 시작해 보세요." />
        <GanttRows label="긴 라벨" range={D.SEMESTER} today={D.TODAY} rows={D.GANTT_LONG} onSelect={pick('gantt')} empty="" />
        <GanttRows label="많은 항목" range={D.SEMESTER} today={D.TODAY} rows={D.GANTT_MANY} onSelect={pick('gantt')} empty="" />
      </DgSection>

      <DgSection title="DotGrid" usage="<DotGrid rows cols items onSelect empty label />" legend={GRID_LEGEND}>
        <DotGrid label="기록 지도" rows={D.GRID_ROWS} cols={D.GRID_COLS} items={D.GRID} onSelect={pick('grid')} empty="" />
        <DotGrid label="빈 기록 지도" rows={D.GRID_ROWS} cols={D.GRID_COLS} items={[]} onSelect={pick('grid')} empty="아직 기록이 없어요. 끝난 활동의 회고를 쓰면 점이 생겨요." />
        <DotGrid label="긴 라벨" rows={D.GRID_LONG_ROWS} cols={D.GRID_LONG_COLS} items={D.GRID_LONG} onSelect={pick('grid')} empty="" />
        <DotGrid label="많은 항목" rows={D.GRID_ROWS} cols={D.GRID_COLS} items={D.GRID_MANY} onSelect={pick('grid')} empty="" />
      </DgSection>

      <DgSection title="Funnel" usage="<Funnel steps onSelect unit='개' empty label />">
        <Funnel label="고른 방법" steps={D.FUNNEL} onSelect={pick('funnel')} empty="" />
        <Funnel label="빈 깔때기" steps={[]} onSelect={pick('funnel')} empty="후보를 아직 못 모았어요. 프로필에서 관심 분야를 골라 보세요." />
        <Funnel label="긴 라벨" steps={D.FUNNEL_LONG} onSelect={pick('funnel')} empty="" />
        <Funnel label="많은 단계" steps={D.FUNNEL_MANY} onSelect={pick('funnel')} empty="" />
      </DgSection>

      <DgSection title="SegmentBar" usage="<SegmentBar segments onSelect empty label />">
        <SegmentBar label="분야 비율" segments={D.SEGMENTS} onSelect={pick('segment')} empty="" />
        <SegmentBar label="빈 비율" segments={D.SEGMENTS.map(s => ({ ...s, value: 0 }))} onSelect={pick('segment')} empty="아직 활동이 없어요. 첫 활동을 고르면 분야 비율이 그려져요." />
        <SegmentBar label="긴 라벨·아주 작은 조각" segments={D.SEGMENTS_LONG} onSelect={pick('segment')} empty="" />
        <SegmentBar label="많은 조각" segments={D.SEGMENTS_MANY} onSelect={pick('segment')} empty="" />
      </DgSection>

      <DgSection title="MiniTile" usage="<MiniTile href title line badge>{그림}</MiniTile>" states={['기본', '빈 그림', '아주 긴 라벨', '큰 개수']}>
        <MiniTile href="#/_kit" title="테크 트리" line="해 본 칸 5개 · 빈 칸 3개"><Pic bars={[40, 70, 55, 90]} /></MiniTile>
        <MiniTile onSelect={() => setLast('tile · empty')} title="관심 흐름" line="기록이 생기면 그려져요"><span className="kit-muted">아직 그림이 없어요</span></MiniTile>
        <MiniTile href="#/_kit" title={D.LONG_LABEL} line={D.LONG_LABEL}><Pic bars={[20, 30]} /></MiniTile>
        <MiniTile href="#/_kit" title="경험 지도" line="확인할 발견" badge={<CountBadge count={12} label="확인할 발견" />}><Pic bars={[30, 50, 70, 20, 60, 80, 40, 90, 10, 55]} /></MiniTile>
      </DgSection>

      <DgSection title="Loop" usage="<Loop nodes={[a, b, c]} onSelect label />" states={['기본', '값 없음', '아주 긴 라벨', '선택됨']}>
        <Loop label="과거·현재·미래" nodes={D.LOOP} onSelect={pick('loop')} />
        <Loop label="값 없는 고리" nodes={[{ id: 'a', label: '기록' }, { id: 'b', label: '분석' }, { id: 'c', label: '추천' }]} onSelect={pick('loop')} />
        <Loop label="긴 라벨" nodes={D.LOOP_LONG} onSelect={pick('loop')} />
        <Loop label="선택됨" nodes={D.LOOP} onSelect={pick('loop')} selectedId="analysis" />
      </DgSection>
    </>
  );
}
