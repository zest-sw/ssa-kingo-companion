import { Button, EmptyState, PageHeader } from '../../components';
import { navigate, type ScreenProps } from '../../app/router';

// ponytail: 기반 작업의 자리 표시 화면이다. home-recommend 화면 워커가 이 폴더 안에서 바꾼다.
export default function RecommendScreen(_props: ScreenProps) {
  return (
    <>
      <PageHeader eyebrow="이번 주 추천" title="추천" />
      <EmptyState
        icon="compass"
        message="가장 추천하는 활동 하나와 대안이 여기에 보여요. 관심 분야를 알려 주면 바로 골라 둘게요."
        action={<Button variant="primary" onClick={() => navigate('home')}>홈으로</Button>}
      />
    </>
  );
}
