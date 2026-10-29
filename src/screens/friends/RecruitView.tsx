import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useApp } from '../../app/AppState';
import { Badge, Button, Card, Chip, EmptyState, useToast } from '../../components';
import { NOTE_MAX, SLOT_RANGE, orderPosts, toggled, validatePost, type RecruitPost } from '../../domain/social';
import { APPLICANTS, OPPORTUNITY_BY_ID, TEAM_OPPORTUNITIES } from '../../data/friends';

type Props = { posts: RecruitPost[]; onPost: (p: RecruitPost) => void };

const SLOT_CHOICES = Array.from({ length: SLOT_RANGE.max - SLOT_RANGE.min + 1 }, (_, i) => SLOT_RANGE.min + i);

export function RecruitView({ posts, onPost }: Props) {
  const { state } = useApp();
  const toast = useToast();
  const [opp, setOpp] = useState('');
  const [slots, setSlots] = useState(2);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [interest, setInterest] = useState<string[]>([]);
  const [applied, setApplied] = useState<string[]>([]);
  const [accepted, setAccepted] = useState<string[]>([]);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // 관심 표시한 기회: 내가 직접 표시했거나, 신청 준비 중인 추천 후보와 같은 기회.
  const preparing = new Set(state.activities.map(a => a.programId));
  const interested = [...interest, ...TEAM_OPPORTUNITIES.filter(o => o.programId && preparing.has(o.programId)).map(o => o.id)];
  const ordered = orderPosts(posts, interested);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const problem = validatePost({ opportunityId: opp, slots, note });
    setError(problem);
    if (problem) return;
    setPending(true);
    // 서버가 없어 올리는 데 걸리는 시간을 흉내 낸다.
    timer.current = window.setTimeout(() => {
      onPost({ id: `post-${Date.now()}`, opportunityId: opp, author: '나', slots, note: note.trim(), mine: true });
      setPending(false);
      setNote('');
      setOpp('');
      toast('모집 글을 올렸어요. 같은 기회에 관심 있는 학생에게 먼저 보여요.');
    }, 500);
  };

  return (
    <div className="fr-cols fr-cols--recruit">
      <Card className="fr-col-side" title="모집 글 올리기">
        <form className="fr-form" onSubmit={submit} noValidate>
          <label className="fr-field">
            <span className="fr-field__label">기회</span>
            <select value={opp} onChange={e => setOpp(e.target.value)} aria-invalid={error?.includes('기회') || undefined}>
              <option value="">팀이 필요한 기회를 골라요</option>
              {TEAM_OPPORTUNITIES.map(o => <option key={o.id} value={o.id}>{o.kind} · {o.title}</option>)}
            </select>
          </label>
          <label className="fr-field">
            <span className="fr-field__label">모집 인원</span>
            <select value={slots} onChange={e => setSlots(Number(e.target.value))}>
              {SLOT_CHOICES.map(n => <option key={n} value={n}>{n}명</option>)}
            </select>
          </label>
          <label className="fr-field">
            <span className="fr-field__label">한 줄 <span className="num fr-field__count">{note.trim().length}/{NOTE_MAX}</span></span>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="어떤 팀원이 좋은지 적어요" aria-invalid={Boolean(error && !error.includes('기회') && !error.includes('인원')) || undefined} />
          </label>
          {error && <p className="fr-error" role="alert">{error}</p>}
          <Button type="submit" variant="primary" block disabled={pending}>{pending ? '올리는 중이에요' : '모집 글 올리기'}</Button>
        </form>
      </Card>

      <Card className="fr-col-main" title="모집 중인 글" action={<span>관심 표시한 기회가 먼저 나와요</span>}>
        {ordered.length === 0 ? (
          <EmptyState icon="flag" message="모집 글이 아직 없어요. 팀원이 필요한 기회를 골라 첫 글을 올려 보세요." />
        ) : (
          <ul className="fr-posts">
            {ordered.map(p => {
              const o = OPPORTUNITY_BY_ID[p.opportunityId];
              if (!o) return null;
              const marked = interested.includes(o.id);
              const done = accepted.length >= p.slots && p.mine;
              return (
                <li key={p.id} className={`fr-post${marked ? ' fr-post--match' : ''}`}>
                  <div className="fr-post__head">
                    <Badge tone="navy">{o.kind}</Badge>
                    <span className="fr-post__deadline num">마감 {o.deadline}</span>
                    {marked && <Badge tone="lime">관심 표시한 기회</Badge>}
                  </div>
                  <h3 className="fr-post__title">{o.title}</h3>
                  <p className="fr-post__note">{p.note}</p>
                  <p className="fr-post__meta">{p.mine ? '내 글' : `${p.author}님`} · {p.slots}명 모집{p.mine && ` · 관심 표시한 공개 학생 ${o.interested}명에게 먼저 보여요`}</p>
                  <div className="fr-post__actions">
                    {p.mine ? (
                      <ul className="fr-applicants">
                        {APPLICANTS.map(name => {
                          const ok = accepted.includes(name);
                          return (
                            <li key={name} className="fr-applicant">
                              <span>{name}님이 지원했어요</span>
                              {ok ? <Badge tone="green" icon="check">수락함</Badge> : <Button size="sm" disabled={done} onClick={() => { setAccepted(a => [...a, name]); toast(`${name}님을 팀원으로 받았어요.`); }}>수락</Button>}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <>
                        <Chip selected={marked} onClick={() => setInterest(list => toggled(list, o.id))}>이 기회에 관심 있어요</Chip>
                        {applied.includes(p.id)
                          ? <Badge tone="neutral">지원했어요 · 답을 기다려요</Badge>
                          : <Button size="sm" variant="primary" onClick={() => { setApplied(a => [...a, p.id]); toast(`${p.author}님에게 지원했어요. 수락은 ${p.author}님이 정해요.`); }}>지원하기</Button>}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
