import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useApp } from '../../app/AppState';
import { Badge, Button, Card, Chip, EmptyState, useToast } from '../../components';
import { interestedIds, recruitLine } from '../../domain/social/summary';
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

  // ponytail: 정렬은 '내가 관심 표시한 기회의 글이 먼저'이다. 내 글이 관심 표시한 학생에게 먼저 보이는 건 숫자(interested)로만 알린다. 실제 배포는 서버가 정할 일이다.
  // 관심 표시한 기회: 내가 직접 표시했거나, 신청 준비 중인 추천 후보와 같은 기회.
  const interested = interestedIds(TEAM_OPPORTUNITIES, state.activities, interest);
  const ordered = orderPosts(posts, interested);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const problem = validatePost({ opportunityId: opp, slots, note });
    setError(problem);
    if (problem) {
      // 칸 옆이 아니라 폼 아래에 한 줄로 쓰므로, 틀린 칸으로 초점을 보내 그 칸이 오류 줄을 읽게 한다(aria-describedby).
      const form = e.currentTarget as HTMLFormElement;
      const name = problem.includes('기회') ? 'opportunity' : problem.includes('인원') ? 'slots' : 'recruit-note';
      form.querySelector<HTMLElement>(`[name="${name}"]`)?.focus();
      return;
    }
    setPending(true);
    // 서버가 없어 올리는 데 걸리는 시간을 흉내 낸다.
    timer.current = window.setTimeout(() => {
      onPost({ id: `post-${Date.now()}`, opportunityId: opp, author: '나', slots, note: note.trim(), mine: true });
      setPending(false);
      setNote('');
      setOpp('');
      toast('모집 글을 올렸어요. 관심 있는 학생이 먼저 봐요');
    }, 500);
  };

  return (
    <>
    <p className="fr-headline">{recruitLine(posts, interested)}</p>
    <div className="fr-cols fr-cols--recruit">
      <Card className="fr-col-side" title="모집 글 올리기">
        <form className="fr-form" onSubmit={submit} noValidate>
          <label className="fr-field">
            <span className="fr-field__label">기회</span>
            <select name="opportunity" value={opp} onChange={e => setOpp(e.target.value)} aria-invalid={error?.includes('기회') || undefined} aria-describedby={error ? 'fr-error' : undefined}>
              <option value="">팀이 필요한 기회를 골라요</option>
              {TEAM_OPPORTUNITIES.map(o => <option key={o.id} value={o.id}>{o.kind} · {o.title}</option>)}
            </select>
          </label>
          <label className="fr-field">
            <span className="fr-field__label">모집 인원</span>
            <select name="slots" value={slots} onChange={e => setSlots(Number(e.target.value))}>
              {SLOT_CHOICES.map(n => <option key={n} value={n}>{n}명</option>)}
            </select>
          </label>
          <label className="fr-field">
            <span className="fr-field__label">한 줄 <span className="num fr-field__count">{note.trim().length}/{NOTE_MAX}</span></span>
            <input name="recruit-note" autoComplete="off" value={note} onChange={e => setNote(e.target.value)} placeholder="어떤 팀원이 좋은지 적어요" aria-invalid={Boolean(error && !error.includes('기회') && !error.includes('인원')) || undefined} aria-describedby={error ? 'fr-error' : undefined} />
          </label>
          {error && <p id="fr-error" className="fr-error" role="alert">{error}</p>}
          <Button type="submit" variant="primary" block disabled={pending}>{pending ? '올리는 중' : '모집 글 올리기'}</Button>
        </form>
      </Card>

      <Card className="fr-col-main os-card" title="모집 중인 글" action={<span>관심 표시한 기회가 먼저 나와요</span>}>
        {ordered.length === 0 ? (
          <EmptyState icon="flag" message="모집 글이 아직 없어요. 팀원이 필요한 기회를 골라 첫 글을 올려 보세요." />
        ) : (
          <ul className="fr-posts os-scroll">
            {ordered.map(p => {
              const o = OPPORTUNITY_BY_ID[p.opportunityId];
              if (!o) return null;
              const marked = interested.includes(o.id);
              const mineAccepted = accepted.filter(k => k.startsWith(`${p.id}:`)).length;
              const done = p.mine && mineAccepted >= p.slots;
              return (
                <li key={p.id} className={`fr-post${marked ? ' fr-post--match' : ''}`}>
                  <div className="fr-post__head">
                    <Badge tone="navy">{o.kind}</Badge>
                    <span className="fr-post__deadline num">마감 {o.deadline}</span>
                    {marked && <Badge tone="lime">관심 표시한 기회</Badge>}
                  </div>
                  <h3 className="fr-post__title">{o.title}</h3>
                  <p className="fr-post__note">{p.note}</p>
                  <p className="fr-post__meta">{p.mine ? '내 글' : `${p.author}님`} · {p.slots}명 모집</p>
                  {p.mine && <p className="fr-post__meta">관심 표시한 학생 {o.interested}명이 먼저 봐요</p>}
                  <div className="fr-post__actions">
                    {p.mine ? (
                      <ul className="fr-applicants">
                        {APPLICANTS.map(name => {
                          const key = `${p.id}:${name}`;
                          const ok = accepted.includes(key);
                          return (
                            <li key={name} className="fr-applicant">
                              <span>{name}님이 지원했어요</span>
                              {ok ? <Badge tone="green" icon="check">수락함</Badge> : <Button size="sm" disabled={done} onClick={() => { setAccepted(a => [...a, key]); toast(`${name}님을 팀원으로 받았어요.`); }}>수락</Button>}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <>
                        <Chip selected={marked} onClick={() => setInterest(list => toggled(list, o.id))}>이 기회에 관심 있어요</Chip>
                        {applied.includes(p.id)
                          ? <Badge tone="neutral">답을 기다려요</Badge>
                          : <Button size="sm" onClick={() => { setApplied(a => [...a, p.id]); toast(`${p.author}님에게 지원했어요. 수락은 ${p.author}님이 정해요`); }}>지원하기</Button>}
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
    </>
  );
}
