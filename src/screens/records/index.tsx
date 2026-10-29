import { Button, EmptyState, PageHeader } from '../../components';
import { navigate, type ScreenProps } from '../../app/router';

// ponytail: 기반 작업의 자리 표시 화면이다. activities-records 화면 워커가 이 폴더 안에서 바꾼다.
export default function RecordsScreen(_props: ScreenProps) {
  return (
    <>
      <PageHeader eyebrow="기록 보관함" title="기록" />
      <EmptyState
        icon="records"
        message="끝난 활동의 회고가 기록 카드로 쌓여요. 내 활동에서 회고 쓰기를 눌러 첫 카드를 만들어 보세요."
        action={<Button variant="primary" onClick={() => navigate('activities')}>내 활동 보기</Button>}
      />
    </>
  );
}
