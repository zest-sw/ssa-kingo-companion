import { useCallback } from 'react';
import { useApp } from '../../app/AppState';
import { navigate } from '../../app/router';
import { useToast } from '../../components';

/**
 * 이 브라우저에 남긴 것을 다 지우고 가입 인터뷰(홈)로 보낸다. 끝난 뒤 토스트 문장만 부르는 곳이 정한다.
 * 프로토타입 정보 '처음부터 다시'와 데이터·개인정보 '내 데이터 지우기'가 함께 쓴다(하는 일은 같고 맥락만 다르다).
 */
export function useStartOver() {
  const { resetAll } = useApp();
  const toast = useToast();
  return useCallback((message: string) => { resetAll(); navigate('home'); toast(message); }, [resetAll, toast]);
}
