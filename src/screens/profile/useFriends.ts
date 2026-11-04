import { useApp } from '../../app/AppState';
import { FRIENDS, INCOMING } from '../../data/friends';

const NONE = { friends: [], incoming: [] };

/** 친구·받은 요청. 예시로 볼 때만 예시 친구가 있고, 새 학생은 0명에서 시작한다 */
export function useFriends() {
  const { state } = useApp();
  return state.demo ? { friends: FRIENDS, incoming: INCOMING } : NONE;
}
