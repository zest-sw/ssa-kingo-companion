import { matchSub, type ScreenProps } from '../../app/router';
import { ListView } from './ListView';
import { Wall } from './Wall';
import './challenges.css';

export default function ChallengesScreen({ sub }: ScreenProps) {
  return matchSub('challenges', sub)?.pattern === 'challenges/list' ? <ListView /> : <Wall />;
}
