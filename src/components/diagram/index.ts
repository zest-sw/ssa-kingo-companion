// 다이어그램 부품. 화면은 src/components/index.ts 를 거쳐 가져온다(확대·이동만 src/components/zoom.ts).
import './diagram.css';

export { DotGrid, type DotItem, type GridAxisItem } from './DotGrid';
export { Funnel, type FunnelStep } from './Funnel';
export { GANTT_STATE_LABEL, GanttRows, type GanttPart, type GanttRow, type GanttState } from './GanttRows';
export { dateLabel, type DateRange } from './geometry';
export { Legend, type LegendItem, type LegendMark } from './Legend';
export { Loop, type LoopNode } from './Loop';
export { MiniTile } from './MiniTile';
export { Piece, type DiagramTone } from './Piece';
export { SegmentBar, type Segment } from './SegmentBar';
export { Timeline, type TimelineItem } from './Timeline';
export { GhostPic, type GhostKind } from './GhostPic';
export { linkPath, useLinkPaths, type LinkPath, type LinkSpec } from './useLinkPaths';
export { TermNav } from './TermNav';
export { Radar, type RadarVertex } from './Radar';
export { useWidth } from './useWidth';
// 확대·이동(ZoomPan)은 첫 덩어리를 무겁게 해서 여기 없다. ../zoom.ts 에서 가져온다.
