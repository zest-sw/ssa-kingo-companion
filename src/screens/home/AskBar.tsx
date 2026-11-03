import { useState, type FormEvent } from 'react';
import { navigate } from '../../app/router';
import { Button, Icon } from '../../components';
import { parseAsk } from '../../domain/recommend-flow/ask';
import { setListIntent } from '../../domain/recommend-flow/intent';

/**
 * 에이전트에게 묻기. 실제 AI 없이 낱말을 추천 필터 조건으로 바꿔 추천 화면(#/recommend)에 넘긴다.
 * 질문 칸이라 role="search" 다. 예시 질문 칩은 서로 다른 질문이라 진입점 점검(audit)에서 세지 않는다.
 * 입력을 비우고 보내면 아무 일도 없다(안내만 보인다).
 */
export function AskBar() {
  const [text, setText] = useState('');
  const [hint, setHint] = useState(false);

  const ask = (q: string) => {
    const t = q.trim();
    if (!t) { setHint(true); return; }
    setListIntent({ filter: parseAsk(t), view: 'detail' });
    navigate('recommend');
  };
  const submit = (e: FormEvent) => { e.preventDefault(); ask(text); };

  return (
    <section className="home-ask" role="search" aria-label="에이전트에게 묻기">
      <form className="home-ask__form" onSubmit={submit}>
        <span className="home-ask__icon"><Icon name="sparkle" size={18} /></span>
        <input
          className="home-ask__input" type="text" value={text} placeholder="에이전트에게 묻기 (예: 이번 주 대회)" aria-label="에이전트에게 묻기" aria-describedby={hint ? 'home-ask-hint' : undefined}
          onChange={e => { setText(e.target.value); setHint(false); }}
        />
        <Button type="submit" variant="primary" size="sm">묻기</Button>
      </form>
      {hint && <p id="home-ask-hint" className="home-ask__hint" role="status">궁금한 걸 적어 보세요.</p>}
    </section>
  );
}
