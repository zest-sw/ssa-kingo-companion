import { useState, type FormEvent } from 'react';
import { navigate } from '../../app/router';
import { Button, Chip, Icon } from '../../components';
import { ASK_EXAMPLES, parseAsk } from '../../domain/recommend-flow/ask';
import { setListIntent } from '../../domain/recommend-flow/intent';

/**
 * 에이전트에게 묻기. 실제 AI 없이 낱말을 추천 필터 조건으로 바꿔 후보 목록(#/recommend/list)에 넘긴다.
 * 입력을 비우고 보내면 아무 일도 없다(안내만 보인다).
 */
export function AskBar() {
  const [text, setText] = useState('');
  const [hint, setHint] = useState(false);

  const ask = (q: string) => {
    const t = q.trim();
    if (!t) { setHint(true); return; }
    setListIntent({ filter: parseAsk(t), view: 'detail' });
    navigate('recommend/list');
  };
  const submit = (e: FormEvent) => { e.preventDefault(); ask(text); };

  return (
    <section className="home-ask" aria-label="에이전트에게 묻기">
      <form className="home-ask__form" onSubmit={submit}>
        <span className="home-ask__icon"><Icon name="sparkle" size={18} /></span>
        <input
          className="home-ask__input" type="text" value={text} placeholder="에이전트에게 묻기" aria-label="에이전트에게 묻기" aria-describedby={hint ? 'home-ask-hint' : undefined}
          onChange={e => { setText(e.target.value); setHint(false); }}
        />
        <Button type="submit" variant="primary">묻기</Button>
      </form>
      <ul className="home-ask__chips" aria-label="예시 질문">
        {ASK_EXAMPLES.map(q => <li key={q}><Chip onClick={() => ask(q)}>{q}</Chip></li>)}
      </ul>
      {hint && <p id="home-ask-hint" className="home-ask__hint" role="status">궁금한 걸 적거나 아래 질문을 눌러 보세요.</p>}
    </section>
  );
}
