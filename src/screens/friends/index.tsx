import { Button, EmptyState, PageHeader } from '../../components';
import { navigate, type ScreenProps } from '../../app/router';

// ponytail: 기반 작업의 자리 표시 화면이다. challenges-friends 화면 워커가 이 폴더 안에서 바꾼다.
export default function FriendsScreen(_props: ScreenProps) {
  return (
    <>
      <PageHeader eyebrow="프로필" title="친구" />
      <EmptyState
        icon="friends"
        message="프로필은 지금 나만 봐요. 공개하면 친구 찾기와 팀원 모집을 쓸 수 있어요."
        action={<Button variant="primary" onClick={() => navigate('home')}>홈으로</Button>}
      />
    </>
  );
}
