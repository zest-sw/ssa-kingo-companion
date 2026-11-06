import { useState, type ReactNode } from 'react';
import { Button, Chip, EmptyState, FieldTag, Icon } from '../../components';
import { navigate } from '../../app/router';
import { axesPresent, filterRecords, groupBySemester, groupsPresent, isFiltered, NO_FILTER, previewOf, semesterLabel, semestersPresent, type ArchiveFilter } from '../../domain/interview/archive';
import { BUNDLE_MAX, BUNDLE_MIN, togglePick } from '../../domain/interview/answer';
import type { RecordItem } from '../../domain/types';
import { AXES, GROUP_LABEL } from '../../domain/vocab';
import { readPicks, writePicks } from './portfolioPicks';

/** 보관함 카드 하나: 분야·날짜, 제목, 미리보기 한 줄, 확인 방식. 고르는 중이면 누르면 담기, 아니면 기록 서랍이 열린다. */
function Tile({ r, selected, picking, picked, onPress }: { r: RecordItem; selected: boolean; picking: boolean; picked: boolean; onPress: (id: string) => void }) {
  const [line] = previewOf(r);
  const school = r.verification === 'school';
  return (
    <li className="ra-tile" data-open={!picking && selected} data-picked={picking && picked}>
      <button type="button" className="ra-tile__btn" aria-pressed={picking ? picked : selected} onClick={() => onPress(r.id)}>
        <span className="ra-tile__meta">
          {picking && <span className="ra-tile__box" aria-hidden="true">{picked && <Icon name="check" size={14} />}</span>}
          <FieldTag field={r.field} /><span>{r.date}</span>
        </span>
        <span className="ra-tile__title">{r.title}</span>
        {line && <span className="ra-tile__line"><b>{line[0]}</b> {line[1]}</span>}
        <span className="ra-tile__how" data-school={school || undefined}><Icon name={school ? 'check' : 'pencil'} size={14} />{school ? '학교 확인' : '직접 입력'}</span>
      </button>
    </li>
  );
}

/** 보관함 거르기 한 줄: 학기·분야·역량 고르기 + 학교 확인만. 칩처럼 작게 둔 고르기 칸이다. */
function Filters({ records, f, set }: { records: RecordItem[]; f: ArchiveFilter; set: (f: ArchiveFilter) => void }) {
  return (
    <div className="ra__filters" role="group" aria-label="보관함 거르기">
      <select className="ra-pick" aria-label="학기" data-on={f.semester !== 'all' || undefined} value={f.semester} onChange={e => set({ ...f, semester: e.target.value })}>
        <option value="all">모든 학기</option>
        {semestersPresent(records).map(s => <option key={s} value={s}>{semesterLabel(s)}</option>)}
      </select>
      <select className="ra-pick" aria-label="분야" data-on={f.group !== 'all' || undefined} value={f.group} onChange={e => set({ ...f, group: e.target.value as ArchiveFilter['group'] })}>
        <option value="all">모든 분야</option>
        {groupsPresent(records).map(g => <option key={g} value={g}>{GROUP_LABEL[g]}</option>)}
      </select>
      <select className="ra-pick" aria-label="역량" data-on={f.axis !== 'all' || undefined} value={f.axis} onChange={e => set({ ...f, axis: e.target.value as ArchiveFilter['axis'] })}>
        <option value="all">모든 역량</option>
        {axesPresent(records).map(a => <option key={a} value={a}>{AXES.find(x => x.id === a)?.label}</option>)}
      </select>
      <Chip icon="check" selected={f.verification === 'school'} onClick={() => set({ ...f, verification: f.verification === 'school' ? 'all' : 'school' })}>학교 확인만</Chip>
    </div>
  );
}

/** 기록 › 보관함 보기: 학기별 카드 격자. 지도와 한 화면에 두지 않는다. 이 칸만 안에서 스크롤한다. 여기서 경험 카드 묶음을 고른다. */
export function Archive({ records, selectedId, onOpen, switcher }: { records: RecordItem[]; selectedId?: string; onOpen: (id: string) => void; switcher?: ReactNode }) {
  const [filter, setFilter] = useState<ArchiveFilter>(NO_FILTER);
  // 묶음 화면에서 돌아오면 고르던 것을 이어서 고친다.
  const [picks, setPicks] = useState<string[]>(() => readPicks().filter(id => records.some(r => r.id === id)));
  const [picking, setPicking] = useState(false);
  const shown = filterRecords(records, filter);
  const groups = groupBySemester(shown);
  const press = (id: string) => (picking ? setPicks(p => togglePick(p, id)) : onOpen(id));
  const openBundle = () => { writePicks(picks); navigate('activities/records/portfolio'); };

  return (
    <section className="ra" aria-labelledby="ra-title">
      <div className="ra__head">
        <h2 id="ra-title" className="ra__title">보관함 <span className="num">{shown.length}</span></h2>
        <Filters records={records} f={filter} set={setFilter} />
        <div className="ra__bundle">
          {picking ? (
            <>
              <span className="ra__count" aria-live="polite"><b className="num">{picks.length}</b>/{BUNDLE_MAX} 골랐어요</span>
              <Button size="sm" variant="ghost" onClick={() => setPicking(false)}>그만 고르기</Button>
              <Button size="sm" variant="primary" disabled={picks.length < BUNDLE_MIN} onClick={openBundle}>묶음 보기</Button>
            </>
          ) : (
            <Button size="sm" icon="doc" onClick={() => setPicking(true)}>경험 카드 묶음 만들기</Button>
          )}
        </div>
        {switcher}
      </div>
      {picking && <p className="ra__guide">면접이나 서류에 쓸 기록을 {BUNDLE_MIN}~{BUNDLE_MAX}개 눌러 골라요.</p>}
      <div className="ra__list os-scroll">
        {groups.length === 0 ? (
          <EmptyState icon="records" message="이 조건에 맞는 기록이 없어요. 거르기를 풀어 보세요." action={isFiltered(filter) ? <Button size="sm" onClick={() => setFilter(NO_FILTER)}>거르기 풀기</Button> : undefined} />
        ) : groups.map(g => (
          <section key={g.semester} aria-labelledby={`sem-${g.semester}`}>
            <h3 id={`sem-${g.semester}`} className="ra__sem">{g.label} <span className="num">{g.items.length}</span></h3>
            <ul className="ra__grid">{g.items.map(r => <Tile key={r.id} r={r} selected={selectedId === r.id} picking={picking} picked={picks.includes(r.id)} onPress={press} />)}</ul>
          </section>
        ))}
      </div>
    </section>
  );
}
