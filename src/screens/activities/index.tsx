import { Button, EmptyState, PageHeader } from '../../components';
import { navigate, type ScreenProps } from '../../app/router';

// ponytail: 기반 작업의 자리 표시 화면이다. activities-records 화면 워커가 이 폴더 안에서 바꾼다.
export default function ActivitiesScreen(_props: ScreenProps) {
  return (
    <>
      <PageHeader eyebrow="2026-2학기" title="내 활동" />
      <EmptyState
        icon="board"
        message="하기로 한 활동이 할 것, 하는 중, 끝난 것으로 모여요. 추천에서 신청 준비를 눌러 시작해 보세요."
        action={<Button variant="primary" onClick={() => navigate('recommend')}>추천 보러 가기</Button>}
      />
    </>
  );
}
