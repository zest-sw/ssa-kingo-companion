import { useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import './career.css';
import {
 jobs, careerFields, resolveRequirement, summarizeField,
 type CareerExperience, type CareerOverrides, type CareerOverride, type JobPosting, type Requirement, type CareerField
} from './jobs';

const activate=(e:ReactKeyboardEvent,fn:()=>void)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}};
const fieldJobs=(field:CareerField):JobPosting[]=>jobs.filter(j=>j.requirements.some(r=>field.reqIds.includes(r.id)));
const jobOf=(reqId:string):JobPosting|undefined=>jobs.find(j=>j.requirements.some(r=>r.id===reqId));
const excerpt=(raw:string,n=56)=>raw.length>n?raw.slice(0,n-1)+'…':raw;
const kindClass:Record<Requirement['kind'],string>={'필수':'required','우대':'preferred','담당업무':'duty'};

// ---------- 1) CareerOverview ----------
export function CareerOverview({experiences,recheckIds,overrides,onBrowseField,onHighlight}:{
 experiences:CareerExperience[];recheckIds:string[];overrides:CareerOverrides;
 onBrowseField:(id:string)=>void;onHighlight:(ids:string[],label:string)=>void;
}){
 const summaries=useMemo(()=>careerFields.map(field=>({field,summary:summarizeField(field,experiences,recheckIds,overrides),relatedJobs:fieldJobs(field)})),[experiences,recheckIds,overrides]);
 return <section className="career-overview" aria-label="채용 요건으로 보는 탐색 분야">
  <div className="career-section-head">
   <div><h2>채용 요건으로 보는 탐색 분야</h2><p>공개 채용 공고의 요건 문장과 내 경험 기록을 연결한 결과예요. 아래 숫자는 적합도 점수가 아니라 확인한 연결 단서 요건 수, 검토한 요건 수, 관련 경험 수입니다.</p></div>
  </div>
  <p className="career-warning" role="note">카카오뱅크 한 기업의 공고 3건을 수동으로 확인한 표본이며 전체 채용 시장을 대표하지 않아요. 일반적인 소통·협업 경험만으로 특정 직무 강점을 확정하지 않습니다.</p>
  <div className="career-field-grid">
   {summaries.map(({field,summary,relatedJobs})=>{
    const disabled=summary.ids.length===0;
    return <article className="career-field-card" key={field.id}>
     <div className="career-field-top"><strong>{field.label}</strong><span className="pill">{summary.label}</span></div>
     <p className="muted">{field.blurb}</p>
     <div className="career-field-counts">
      <span><b>{summary.linked}</b><small>연결 단서 요건 수</small></span>
      <span><b>{summary.total}</b><small>검토한 요건 수</small></span>
      <span><b>{summary.ids.length}</b><small>관련 경험 수</small></span>
     </div>
     <ul className="career-field-jobs" aria-label={field.label+' 근거 공고'}>
      {relatedJobs.map(j=><li key={j.id}>
       <span className="career-job-name">{j.company} · {j.title}</span>
       <span className={'state'+(j.status==='모집 중 표기'?'':' waiting')}>{j.status}</span>
       <small>{j.level} · {j.deadline}</small>
      </li>)}
     </ul>
     <small className="muted">{summary.specificIds.length>0?'구체적 요건과 관련된 행동 단서 '+summary.specificIds.length+'개':'구체적 요건 근거는 아직 미확인입니다.'}</small>
     <div className="career-field-actions">
      <button onClick={()=>onBrowseField(field.id)} aria-label={field.label+' 분야 탐색으로 이동'}>분야 탐색</button>
      <button className="primary" disabled={disabled} onClick={()=>onHighlight(summary.ids,field.label+' 관련 경험')}>관련 경험 강조</button>
     </div>
    </article>;
   })}
  </div>
 </section>;
}

// ---------- shared: bipartite requirement-experience graph ----------
function RecordGraph({requirements,resolved,experiences,selected,onSelectReq,onSelectExp}:{
 requirements:Requirement[];resolved:Map<string,ReturnType<typeof resolveRequirement>>;experiences:CareerExperience[];
 selected:string|null;onSelectReq:(id:string)=>void;onSelectExp:(id:string)=>void;
}){
 const expIds=useMemo(()=>[...new Set(requirements.flatMap(r=>resolved.get(r.id)?.records.map(x=>x.id)||[]))],[requirements,resolved]);
 const expList=expIds.map(id=>experiences.find(e=>e.id===id)).filter((e):e is CareerExperience=>!!e);
 const rowH=58;const height=Math.max(requirements.length,expList.length,1)*rowH+30;
 const reqY=(i:number)=>24+i*rowH;const expY=(i:number)=>24+i*rowH;
 const selectedReq=selected?.startsWith('req-')?selected.slice(4):null;
 const selectedExp=selected?.startsWith('exp-')?selected.slice(4):null;
 const litExpIds:string[]=selectedReq?(resolved.get(selectedReq)?.records||[]).map(r=>r.id):[];
 const litExp=new Set(litExpIds);
 const litReqIds:string[]=selectedExp?requirements.filter(r=>(resolved.get(r.id)?.records||[]).some(x=>x.id===selectedExp)).map(r=>r.id):[];
 const litReq=new Set(litReqIds);
 if(expList.length===0)return <p className="muted career-graph-empty">현재 이 공고의 요건과 연결된 경험이 없어 그래프를 그릴 수 없어요.</p>;
 return <div className="career-graph-wrap"><svg className="career-graph" viewBox={'0 0 320 '+height} role="group" aria-label="요건과 경험의 연결 그래프">
  {requirements.map((req,i)=>{const rec=resolved.get(req.id);return rec?.records.map(record=>{const j=expList.findIndex(e=>e.id===record.id);if(j<0)return null;const active=selectedReq?req.id===selectedReq&&litExp.has(record.id):selectedExp?record.id===selectedExp&&litReq.has(req.id):false;const y1=reqY(i),y2=expY(j);return <path key={req.id+'-'+record.id} className={'career-edge '+(rec.status==='학생 확인한 연결'?'confirmed':'proposed')+(active?' lit':'')} d={`M72 ${y1} C170 ${y1} 150 ${y2} 248 ${y2}`}/>;});})}
  {requirements.map((req,i)=><g key={'req-'+req.id} className={'career-node req'+(selectedReq===req.id?' lit':'')} role="button" tabIndex={0} aria-pressed={selectedReq===req.id} aria-label={'요건 선택: '+req.label} onClick={()=>onSelectReq(req.id)} onKeyDown={e=>activate(e,()=>onSelectReq(req.id))}><title>{req.label}</title><rect x="2" y={reqY(i)-18} width="140" height="36" rx="10"/><text x="72" y={reqY(i)+5} textAnchor="middle">{req.label.length>13?req.label.slice(0,12)+'…':req.label}</text></g>)}
  {expList.map((exp,j)=><g key={'exp-'+exp.id} className={'career-node exp'+(selectedExp===exp.id?' lit':'')} role="button" tabIndex={0} aria-pressed={selectedExp===exp.id} aria-label={'경험 선택: '+exp.title} onClick={()=>onSelectExp(exp.id)} onKeyDown={e=>activate(e,()=>onSelectExp(exp.id))}><title>{exp.title}</title><rect x="178" y={expY(j)-18} width="140" height="36" rx="10"/><text x="248" y={expY(j)+5} textAnchor="middle">{exp.title.length>11?exp.title.slice(0,10)+'…':exp.title}</text></g>)}
 </svg></div>;
}

// ---------- requirement card with inline edit ----------
function RequirementCard({req,job,experiences,recheckIds,overrides,onOverrideChange,onHighlight,onOpenArchive,graphSelected,onGraphSelectFromCard}:{
 req:Requirement;job:JobPosting;experiences:CareerExperience[];recheckIds:string[];overrides:CareerOverrides;
 onOverrideChange:(reqId:string,override:CareerOverride)=>void;onHighlight:(ids:string[],label:string)=>void;onOpenArchive:(id:string)=>void;
 graphSelected:string|null;onGraphSelectFromCard:(id:string)=>void;
}){
 const resolved=resolveRequirement(req,experiences,recheckIds,overrides);
 const override=overrides[req.id];
 const candidateIds=override?.ids??req.seedIds;
 const existingCandidates=experiences.filter(e=>candidateIds.includes(e.id));
 const recheckCandidates=existingCandidates.filter(e=>recheckIds.includes(e.id)&&override?.status!=='confirmed');
 const [editing,setEditing]=useState(false);
 const [draftIds,setDraftIds]=useState<string[]>([]);
 const [draftNote,setDraftNote]=useState('');
 const openEdit=()=>{setDraftIds(existingCandidates.map(e=>e.id));setDraftNote(override?.note||req.connection);setEditing(true);};
 const toggleDraft=(id:string)=>setDraftIds(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
 const saveEdit=()=>{onOverrideChange(req.id,{ids:draftIds,note:draftNote,status:'proposed'});setEditing(false);};
 const confirm=()=>onOverrideChange(req.id,{ids:existingCandidates.map(e=>e.id),note:override?.note||req.connection,status:'confirmed'});
 const removeLink=()=>onOverrideChange(req.id,{ids:[],note:'',status:'proposed'});
 const confirmDisabled=existingCandidates.length===0||override?.status==='confirmed';
 const isLit=graphSelected==='req-'+req.id||resolved.records.some(e=>graphSelected==='exp-'+e.id);
 return <article className={'career-req-card '+(isLit?'graph-lit':'')} id={'career-req-'+req.id}>
  <div className="career-req-top"><span className={'career-kind career-kind-'+kindClass[req.kind]}>{req.kind}</span>{req.specific&&<span className="pill">구체 요건</span>}<span className={'state'+(resolved.status==='미확인'?' waiting':'')}>{resolved.status}</span></div>
  <blockquote>“{excerpt(req.raw,90)}”</blockquote>
  <h3>{req.label}</h3>
  {resolved.needsRecheck&&<p className="career-recheck-note">{override?.invalidated==='deleted'?'삭제된 경험의 연결을 제거했습니다. 아래는 남아 있는 경험이며, 남은 근거로 관계를 다시 확인할 수 있어요.':'연결된 경험 중 일부가 수정되어 재확인이 필요해요. 학생이 다시 확인하기 전까지 수정된 예시 근거에서 제외합니다.'}</p>}
  {resolved.records.length>0?<div className="career-record-list">
   {resolved.records.map(e=><div className="career-record" key={e.id}>
    <div><strong>{e.title}</strong><p>{resolved.note}</p><p><b>내 역할</b> {e.role||'미확인'}<br/><b>직접 한 행동</b> {e.action||'미확인'}<br/><b>결과·피드백</b> {e.result||'미확인'}</p><blockquote>원문: “{e.quote||'미확인'}”</blockquote>{e.artifacts.length>0&&<small className="muted">{e.artifacts.join(', ')} · 제목 기록, 실제 파일 미연결</small>}</div>
    <button onClick={()=>onOpenArchive(e.id)}>아카이브 원문 열기</button>
   </div>)}
  </div>:<p className="muted">{req.gap} 아직 임의로 도구·경력을 추정하지 않아요.</p>}
  {recheckCandidates.length>0&&<div className="career-record-list career-recheck-list">
   {recheckCandidates.map(e=><div className="career-record recheck" key={e.id}>
    <div><strong>{e.title}</strong><span className="pill">정정 후 재확인 필요</span><p>수정된 직접 행동: {e.action||'미확인'}</p><p>수정된 원문 근거: “{e.quote||'미확인'}”</p><small className="muted">학생이 바뀐 사실을 읽고 다시 연결을 확인하면 예시 근거로 포함돼요.</small></div>
    <button onClick={()=>onOpenArchive(e.id)}>아카이브 원문 열기</button>
   </div>)}
  </div>}
  {resolved.records.length>0&&<p className="career-connection-limit"><b>한계·미확인</b> {req.gap}</p>}
  <p className="career-next">다음 실험: {req.next}</p><small className="muted">연결 확인은 학생이 근거 관계를 확인했다는 뜻입니다. 요건 충족·지원 자격·채용 확률을 판정하지 않습니다.</small>
  <div className="career-req-actions">
   <button disabled={confirmDisabled} onClick={confirm}>연결 확인</button>
   <button onClick={openEdit}>근거 수정</button>
   <button className="danger-text" disabled={resolved.records.length===0&&recheckCandidates.length===0&&!override} onClick={removeLink}>연결 제거</button>
   <button disabled={resolved.records.length===0} onClick={()=>onHighlight(resolved.records.map(r=>r.id),req.label+' 연결 보기')}>내 경험 지도에서 보기</button>
   <button className={graphSelected==='req-'+req.id?'selected':''} aria-pressed={graphSelected==='req-'+req.id} onClick={()=>onGraphSelectFromCard(req.id)}>그래프에서 보기</button>
  </div>
  {editing&&<div className="career-edit-panel">
   <p className="muted">연결 확인은 해당 사실·관계를 확인했다는 뜻이며 자격 충족을 선언하는 것은 아니에요.</p>
   <fieldset><legend>연결할 경험 선택</legend>{experiences.map(e=><label key={e.id}><input type="checkbox" checked={draftIds.includes(e.id)} onChange={()=>toggleDraft(e.id)}/>{e.title}</label>)}</fieldset>
   <label className="field">근거 메모<textarea value={draftNote} onChange={ev=>setDraftNote(ev.target.value)}/></label>
   <div className="career-edit-actions"><button onClick={()=>setEditing(false)}>취소</button><button className="primary" onClick={saveEdit}>예시 연결로 저장</button></div>
  </div>}
 </article>;
}

// ---------- 2) JobExplorer ----------
export function JobExplorer({experiences,recheckIds,overrides,field,onFieldChange,savedIDs,onToggleSave,onOverrideChange,onHighlight,onOpenArchive}:{
 experiences:CareerExperience[];recheckIds:string[];overrides:CareerOverrides;field:string;onFieldChange:(id:string)=>void;
 savedIDs:string[];onToggleSave:(id:string)=>void;onOverrideChange:(reqId:string,override:CareerOverride)=>void;
 onHighlight:(ids:string[],label:string)=>void;onOpenArchive:(id:string)=>void;
}){
 const [activeOnly,setActiveOnly]=useState(true);
 const [selectedJobId,setSelectedJobId]=useState<string|null>(null);
 const [graphSelected,setGraphSelected]=useState<string|null>(null);
 const selectedField=field!=='all'?careerFields.find(f=>f.id===field):undefined;
 const list=jobs.filter(j=>(!selectedField||j.requirements.some(r=>selectedField.reqIds.includes(r.id)))&&(!activeOnly||j.status==='모집 중 표기'));
 const job=jobs.find(j=>j.id===selectedJobId)||null;
 const resolvedMap=useMemo(()=>{const m=new Map<string,ReturnType<typeof resolveRequirement>>();if(job)job.requirements.forEach(r=>m.set(r.id,resolveRequirement(r,experiences,recheckIds,overrides)));return m;},[job,experiences,recheckIds,overrides]);
 const selectReqFromGraph=(reqId:string)=>{setGraphSelected('req-'+reqId);document.getElementById('career-req-'+reqId)?.scrollIntoView({block:'nearest',behavior:'smooth'});};
 const selectExpFromGraph=(expId:string)=>{setGraphSelected('exp-'+expId);};
 return <section className="career-explorer" aria-label="채용 요건으로 보는 직무 탐색">
  <p className="career-policy-note">학교 활동 기록은 실무 경력, SQL·Python 실무 사용, B2B 서비스 기획, 상용화 경험과 같다고 보지 않아요. 제목만 있는 결과물은 실제 파일이 연결된 것이 아닙니다.</p>
  <div className="career-filters">
   <label className="field">분야 필터<select aria-label="분야 필터" value={field} onChange={e=>onFieldChange(e.target.value)}><option value="all">전체</option>{careerFields.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
   <button aria-pressed={activeOnly} className={activeOnly?'selected':''} onClick={()=>setActiveOnly(v=>!v)}>모집중 표본만 {activeOnly?'켜짐':'꺼짐'}</button>
  </div>
  {!job?<>
   <div className="career-job-grid">
    {list.map(j=>{const saved=savedIDs.includes(j.id);const early=j.deadline.includes('조기');return <article className="career-job-card" key={j.id}>
     <div className="career-job-head"><span className="pill">{j.field}</span><span className={'state'+(j.status==='모집 중 표기'?'':' waiting')}>{j.status}</span></div>
     <h3>{j.company} · {j.title}</h3>
     <p className="muted">{j.level}</p>
     <p className="career-deadline">마감 {j.deadline}{early&&' · 조기 마감 가능'}</p>
     <small className="muted">원문 확인일 {j.checkedAt} · 지원 가능 여부 미확인</small>
     <div className="career-job-actions">
      <a href={j.url} target="_blank" rel="noopener noreferrer">원문 보기</a>
      <button aria-pressed={saved} className={saved?'selected':''} onClick={()=>onToggleSave(j.id)}>{saved?'관심 공고 저장됨':'관심 공고 저장'}</button>
      <button className="primary" onClick={()=>{setSelectedJobId(j.id);setGraphSelected(null);}}>상세 보기</button>
     </div>
    </article>;})}
   </div>
   {list.length===0&&<div className="career-empty"><p className="muted">현재 조건에 맞는 모집중 공고 표본이 없어요. 이 분야의 근거는 경력·마감 공고이며 직무 참고로만 사용할 수 있습니다.</p><button onClick={()=>setActiveOnly(false)}>직무 참고용 과거 공고 포함</button></div>}
  </>:<>
   <button className="text-button career-back" onClick={()=>{setSelectedJobId(null);setGraphSelected(null);}}>목록으로</button>
   <div className="career-job-detail">
    <div className="career-job-head"><span className="pill">{job.field}</span><span className={'state'+(job.status==='모집 중 표기'?'':' waiting')}>{job.status}</span></div>
    <h2>{job.company} · {job.title}</h2>
    <p className="career-deadline">마감 {job.deadline}</p>
    <small className="muted">원문 확인일 {job.checkedAt} · <a href={job.url} target="_blank" rel="noopener noreferrer">원문 보기</a> · 지원 가능 여부 미확인</small>
    <h3 className="career-subhead">지원 조건</h3>
    <dl className="detail-list career-conditions">{job.conditions.map(c=><div key={c.label}><dt>{c.label}</dt><dd>{c.value}</dd></div>)}</dl>
    <h3 className="career-subhead">요건과 경험 연결</h3>
    <RecordGraph requirements={job.requirements} resolved={resolvedMap} experiences={experiences} selected={graphSelected} onSelectReq={selectReqFromGraph} onSelectExp={selectExpFromGraph}/>
    <div className="career-req-grid">{job.requirements.map(req=><RequirementCard key={req.id} req={req} job={job} experiences={experiences} recheckIds={recheckIds} overrides={overrides} onOverrideChange={onOverrideChange} onHighlight={onHighlight} onOpenArchive={onOpenArchive} graphSelected={graphSelected} onGraphSelectFromCard={selectReqFromGraph}/>)}</div>
   </div>
  </>}
 </section>;
}

// ---------- 3) CareerDataPanel ----------
export function CareerDataPanel(){
 const steps=['공개 채용 공고 원문 1회 수동 조사 (운영 크롤러 미연결)','필수/우대/담당업무 및 AND·OR 조건 문장 추출','중복·버전·마감 시각 검증','공통 요건 DB에 정규화해 저장','학생별 경험 근거 매칭 제안 및 학생 확인','직무 탐색 가설(분야 요약) 생성','경험 수정·삭제 시 연결·확인 상태를 파생 데이터에 전파'];
 return <details className="panel career-data-panel">
  <summary>채용-경험 연결 데이터 흐름 <span>수동 조사 표본 · 운영 크롤러 없음</span></summary>
  <ol className="career-flow">{steps.map(s=><li key={s}>{s}</li>)}</ol>
  <p className="muted">카카오뱅크 공고는 robots.txt에서 해당 채용 경로가 Allow로 확인됐지만, 약관·재배포 조건은 별도로 사람이 확인해야 해요. pxd 커리어스 하위 경로는 robots.txt Disallow가 있어 자동 수집 대상에서 제외했습니다.</p>
  <p className="muted">공통 공고 요건 인덱스는 어떤 학생의 개인 기록·개인 임베딩과도 분리해서 저장하는 설계입니다. 실제 동의·보관·삭제 파이프라인은 아직 연결하지 않았습니다.</p>
 </details>;
}
