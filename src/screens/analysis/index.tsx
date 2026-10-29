import { Button, EmptyState, PageHeader } from '../../components';
import { navigate, type ScreenProps } from '../../app/router';

// ponytail: 기반 작업의 자리 표시 화면이다. analysis 화면 워커가 이 폴더 안에서 바꾼다.
export default function AnalysisScreen(_props: ScreenProps) {
  return (
    <>
      <PageHeader eyebrow="나의 분석" title="나의 분석" />
      <EmptyState
        icon="analysis"
        message="기록이 쌓이면 어느 분야로 가고 있는지 그림으로 보여 줘요. 회고를 하나 남겨 보세요."
        action={<Button variant="primary" onClick={() => navigate('records')}>기록 보러 가기</Button>}
      />
    </>
  );
}
