import { Button, EmptyState, PageHeader } from '../../components';
import { navigate, type ScreenProps } from '../../app/router';

// ponytail: 기반 작업의 자리 표시 화면이다. home-recommend 화면 워커가 이 폴더 안에서 바꾼다.
export default function HomeScreen(_props: ScreenProps) {
  return (
    <>
      <PageHeader eyebrow="2026-2학기" title="나의 상태창" />
      <EmptyState
        icon="home"
        message="오늘 챙길 것과 이번 학기 숫자가 여기에 모여요. 먼저 추천에서 해 볼 활동을 골라 보세요."
        action={<Button variant="primary" onClick={() => navigate('recommend')}>추천 보러 가기</Button>}
      />
    </>
  );
}
