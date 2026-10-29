import { Button, EmptyState, PageHeader } from '../../components';
import { navigate, type ScreenProps } from '../../app/router';

// ponytail: 기반 작업의 자리 표시 화면이다. challenges-friends 화면 워커가 이 폴더 안에서 바꾼다.
export default function ChallengesScreen(_props: ScreenProps) {
  return (
    <>
      <PageHeader eyebrow="2026-2학기" title="도전 과제" />
      <EmptyState
        icon="trophy"
        message="활동과 회고로 여는 도전 과제가 여기에 모여요. 첫 회고를 쓰면 하나가 열려요."
        action={<Button variant="primary" onClick={() => navigate('activities')}>내 활동 보기</Button>}
      />
    </>
  );
}
