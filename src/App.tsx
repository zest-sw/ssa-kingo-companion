import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import './index.css';

type Route = 'home' | 'map' | 'explore' | 'archive' | 'reflection' | 'data';
type NodeKind = 'experience' | 'artifact' | 'reflection';
type LinkStatus = 'confirmed' | 'proposed';
type AnalysisState = '대기' | '진행 중' | '완료';

type Experience = {
  id: string;
  title: string;
  type: string;
  role: string;
  action: string;
  result: string;
  reflection: string;
  quote: string;
  period: string;
  learn?: string;
};

type Activity = {
  id: string;
  title: string;
  source: string;
  interest: string;
  kind: string;
  task: string;
  deliverable: string;
  prerequisite: string;
  deadline: string;
  checked: string;
  reason: string;
};

type NodeItem = { id: string; label: string; kind: NodeKind; x: number; y: number; expId?: string };
type LinkItem = { id: string; from: string; to: string; label: string; status: LinkStatus; question?: string; note?: string };

const routes: { id: Route; label: string; icon: string }[] = [
  { id: 'home', label: '내 성장 홈', icon: 'home' },
  { id: 'map', label: '경험 지도', icon: 'map' },
  { id: 'explore', label: '활동 탐색', icon: 'search' },
  { id: 'archive', label: '활동 아카이브', icon: 'archive' },
  { id: 'reflection', label: '회고 도우미', icon: 'chat' },
  { id: 'data', label: '데이터·분석', icon: 'data' },
];

const interests = ['사용자 이해', '서비스 기획', '문제 정리', '팀 협업', '데이터 관찰'];
const sources = ['전체', '학교 공지', '학과 공지', 'Challenge Square', '외부 활동'];

const seedExperiences: Experience[] = [
  { id: 'e1', title: '팀 서비스 개선안', type: '교과', role: '기획과 회의 정리', action: '팀원 의견을 모아 사용자가 겪는 불편을 문장으로 정리했다.', result: '발표용 제안서 초안을 만들고 팀 피드백을 반영했다.', reflection: '의견 차이를 바로 결론으로 밀지 않고 문제 문장으로 바꾸는 일이 중요했다.', quote: '서로 다른 의견을 한 문장으로 묶으니 다음 행동이 보였다.', period: '1학기' },
  { id: 'e2', title: '사용자 인터뷰 과제', type: '프로젝트', role: '질문 작성과 인터뷰 진행', action: '질문지를 만들고 사용자 답변에서 반복되는 표현을 표시했다.', result: '처음 가정과 다른 사용 맥락을 발견했다.', reflection: '내 생각보다 사용자의 실제 말과 행동을 먼저 봐야 했다.', quote: '사용자가 왜 그렇게 했는지 다시 물어보니 가정이 달라졌다.', period: '1학기' },
  { id: 'e3', title: '리서치 스터디 메모', type: '비교과', role: '사례 조사', action: '서비스 리서치 사례를 읽고 좋은 질문 예시를 모았다.', result: '다음 인터뷰에서 써볼 질문 목록을 만들었다.', reflection: '잘 정리된 사례를 내 상황에 맞게 줄여 쓰는 연습이 필요하다.', quote: '좋은 질문은 답을 유도하지 않고 상황을 떠올리게 했다.', period: '2학기' },
];

const initialActivities: Activity[] = [
  { id: 'a1', title: '사용자 이야기 정리 워크숍', source: 'Challenge Square', interest: '사용자 이해', kind: '워크숍', task: '인터뷰 기록에서 반복되는 표현을 묶어보기', deliverable: '질문 목록과 인사이트 메모', prerequisite: '초보 가능, 개인 노트북', deadline: '예시 마감 2026.10.30', checked: '예시 확인일 2026.10.07', reason: '사용자 답변을 표시했던 경험과 연결된 예시입니다.' },
  { id: 'a2', title: '학과 서비스 문제정의 프로젝트', source: '학과 공지', interest: '문제 정리', kind: '프로젝트', task: '교내 불편을 관찰하고 문제 문장으로 정리하기', deliverable: '문제정의 1쪽 문서', prerequisite: '팀 활동 가능 시간', deadline: '예시 마감 2026.11.04', checked: '예시 확인일 2026.10.07', reason: '의견을 모아 문제를 정리한 경험과 연결된 예시입니다.' },
  { id: 'a3', title: '교내 서비스 기획 발표회', source: '학교 공지', interest: '서비스 기획', kind: '발표', task: '기획 배경과 사용자 근거를 짧게 발표하기', deliverable: '5분 발표 자료', prerequisite: '초안 아이디어', deadline: '예시 마감 2026.11.18', checked: '예시 확인일 2026.10.07', reason: '발표용 제안서 초안을 만든 경험을 확장하는 예시입니다.' },
  { id: 'a4', title: '데이터 관찰 미니 캠프', source: 'Challenge Square', interest: '데이터 관찰', kind: '캠프', task: '작은 표본을 보고 질문 만들기', deliverable: '관찰 메모와 후속 질문', prerequisite: '기초 스프레드시트', deadline: '예시 마감 2026.12.01', checked: '예시 확인일 2026.10.07', reason: '리서치 메모를 정량 자료와 함께 보는 실험입니다.' },
  { id: 'a5', title: '외부 문제해결 아이디어톤', source: '외부 활동', interest: '팀 협업', kind: '아이디어톤', task: '팀과 가설을 세우고 작은 해결안을 설명하기', deliverable: '아이디어 보드', prerequisite: '주말 참여 가능', deadline: '예시 마감 2026.12.12', checked: '예시 확인일 2026.10.07', reason: '팀 의견을 정리한 경험을 다른 맥락에서 써보는 예시입니다.' },
];

const baseNodes: NodeItem[] = [
  { id: 'n1', label: '팀 서비스 개선안', kind: 'experience', x: 18, y: 26, expId: 'e1' },
  { id: 'n2', label: '문제정의 메모', kind: 'artifact', x: 46, y: 18, expId: 'e1' },
  { id: 'n3', label: '사용자 인터뷰 과제', kind: 'experience', x: 70, y: 34, expId: 'e2' },
  { id: 'n4', label: '질문지 초안', kind: 'artifact', x: 52, y: 58, expId: 'e2' },
  { id: 'n5', label: '리서치 스터디 메모', kind: 'experience', x: 23, y: 70, expId: 'e3' },
  { id: 'n6', label: '회고 문장', kind: 'reflection', x: 78, y: 74, expId: 'e3' },
];

const initialLinks: LinkItem[] = [
  { id: 'l1', from: 'n1', to: 'n2', label: 'CONFIRMED 근거', status: 'confirmed' },
  { id: 'l2', from: 'n3', to: 'n4', label: 'CONFIRMED 산출물', status: 'confirmed' },
  { id: 'l3', from: 'n4', to: 'n5', label: 'PROPOSED 같은 기법', status: 'proposed', question: '질문지 초안과 리서치 메모가 같은 질문 정리 기법을 쓴 경험인가요?' },
  { id: 'l4', from: 'n1', to: 'n3', label: 'PROPOSED 사용자 관심', status: 'proposed', question: '팀 개선안과 인터뷰 과제가 모두 사용자 이야기에 관심을 둔 경험인가요?' },
  { id: 'l5', from: 'n5', to: 'n6', label: 'CONFIRMED 회고', status: 'confirmed' },
];

const hypotheses = [
  { title: '의견을 모아 문제를 정리한 경험', note: '팀 회의 기록과 문제정의 메모에서 반복되는 패턴입니다.', links: ['팀 서비스 개선안', '문제정의 메모'] },
  { title: '사용자 이야기에 관심을 표현함', note: '인터뷰 과제와 질문지 초안에서 보이는 샘플 가설입니다.', links: ['사용자 인터뷰 과제', '질문지 초안'] },
  { title: '사례를 내 상황에 맞게 줄여보려 함', note: '리서치 스터디 메모 기반의 임시 해석입니다.', links: ['리서치 스터디 메모'] },
];

function Icon({ name, size = 21 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    home: 'M4 11.5 12 4l8 7.5V20H5v-8.5', map: 'M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2V6z M9 4v14 M15 6v14', search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z M15.5 15.5 20 20', archive: 'M4 5h16v4H4z M6 9v11h12V9 M10 13h4', chat: 'M4 5h16v11H9l-5 4V5z M8 9h8 M8 12h5', data: 'M5 18V8 M12 18V4 M19 18v-6 M4 20h16', plus: 'M12 5v14 M5 12h14', close: 'M6 6l12 12 M18 6 6 18', arrow: 'M5 12h14 M13 6l6 6-6 6', bookmark: 'M6 4h12v17l-6-4-6 4V4z', reset: 'M5 7v5h5 M19 17a7 7 0 0 1-12-5 M19 17v-5h-5 M5 7a7 7 0 0 1 12 5', check: 'M4 12l5 5L20 6', leaf: 'M12 21C5 17 2 10 4 4c5 .5 7 3 8 7 1-4 4-6 8-7 2 6-1 13-8 17z M12 11v10', trash: 'M5 7h14 M9 7V5h6v2 M8 10v8 M16 10v8 M7 7l1 14h8l1-14', edit: 'M4 20h4L19 9l-4-4L4 16v4z M13 7l4 4'
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.arrow} /></svg>;
}

function Thumb({ tone = 0 }: { tone?: number }) {
  return <svg className={`thumb tone-${tone % 6}`} viewBox="0 0 320 170" role="img" aria-label="추상 활동 썸네일"><rect width="320" height="170" rx="18" fill="currentColor" />{tone % 3 === 0 ? <g><circle cx="108" cy="82" r="42" fill="#8DC63F" /><rect x="145" y="48" width="86" height="78" rx="13" fill="#EFF5E4" /><path d="M70 126c37-54 72-71 132-28" stroke="#124633" strokeWidth="6" fill="none" /></g> : tone % 3 === 1 ? <g><path d="M73 126l54-84 58 84z" fill="#8DC63F" /><circle cx="203" cy="83" r="43" fill="#EFF5E4" /><path d="M96 77h126 M160 42v89" stroke="#124633" strokeWidth="5" /></g> : <g><rect x="76" y="43" width="76" height="76" rx="16" fill="#EFF5E4" /><rect x="163" y="43" width="76" height="76" rx="38" fill="#8DC63F" /><path d="M95 132c42-30 88-30 130 0" stroke="#124633" strokeWidth="5" fill="none" /></g>}</svg>;
}


const kindLabels: Record<NodeKind,string> = { experience:'활동', artifact:'결과물', reflection:'회고' };
const linkLabel = (l: LinkItem) => l.label.replace(/^(CONFIRMED|PROPOSED)\s*/, '');

export default function App() {
  const [route,setRoute] = useState<Route>('home');
  const [experiences,setExperiences] = useState<Experience[]>(seedExperiences);
  const [bookmarks,setBookmarks] = useState<string[]>([]);
  const [source,setSource] = useState('전체');
  const [interest,setInterest] = useState('전체');
  const [chosenInterests,setChosenInterests] = useState(['사용자 이해','문제 정리']);
  const [links,setLinks] = useState<LinkItem[]>(initialLinks);
  const [selectedNode,setSelectedNode] = useState<NodeItem|null>(null);
  const [selectedLink,setSelectedLink] = useState<LinkItem|null>(null);
  const [connectionText,setConnectionText] = useState('');
  const [connectionNote,setConnectionNote] = useState('');
  const [detailActivity,setDetailActivity] = useState<Activity|null>(null);
  const [editor,setEditor] = useState<Experience|null>(null);
  const [interestsOpen,setInterestsOpen] = useState(false);
  const [info,setInfo] = useState(false);
  const [analysis,setAnalysis] = useState<AnalysisState>('완료');
  const [queued,setQueued] = useState('새 비공개 분석 대기 없음');
  const [reflectId,setReflectId] = useState('e2');
  const [cacheLabel,setCacheLabel] = useState('예시 프로필 v0.2 · 실제 분석 미수행');
  const nodes = useMemo<NodeItem[]>(() => {
    const base = baseNodes.filter(n => experiences.some(e => e.id === n.expId)).map(n => ({...n,label:n.kind==='experience' ? (experiences.find(e=>e.id===n.expId)?.title || n.label) : n.label}));
    const extra = experiences.filter(e => !baseNodes.some(n => n.expId===e.id)).map((e,i):NodeItem=>({id:'n-'+e.id,label:e.title,kind:'experience',expId:e.id,x:12+(i%4)*24,y:89+Math.floor(i/4)*17}));
    return [...base,...extra];
  },[experiences]);
  const activeLinks = links.filter(l=>nodes.some(n=>n.id===l.from)&&nodes.some(n=>n.id===l.to));
  const currentExp = experiences.find(e=>e.id===reflectId)||experiences[0];
  const go = (r:Route) => {setRoute(r);window.scrollTo({top:0,behavior:'smooth'});};
  const queue = (label:string) => {setAnalysis('대기');setQueued(label+' · 비공개 분석 대기 (시뮬레이션)');};
  const toggleBookmark = (id:string) => setBookmarks(b=>b.includes(id)?b.filter(x=>x!==id):[...b,id]);
  const openConnection = (l:LinkItem) => {setSelectedLink(l);setConnectionText(linkLabel(l).replace(/\?$/,''));setConnectionNote(l.note||'');};
  const openReflection = (id:string) => {setReflectId(id);setSelectedNode(null);go('reflection');};
  const saveExperience = (e:Experience) => {
    const saved = {...e,title:e.title.trim(),id:e.id||'e-'+Date.now().toString(36),quote:e.quote||e.learn||e.reflection||e.action||''};
    setExperiences(old=>e.id?old.map(x=>x.id===e.id?saved:x):[...old,saved]);
    queue(saved.title+' 저장');setEditor(null);
  };
  const removeExperience = (id:string) => {setExperiences(old=>old.filter(e=>e.id!==id));queue('경험 삭제 전파 예시');};
  const finishAnalysis = () => {setAnalysis('완료');setQueued('새 비공개 분석 대기 없음');setCacheLabel('완료 상태 예시 · 실제 분석 미수행');};
  const reset = () => {setRoute('home');setExperiences(seedExperiences);setBookmarks([]);setSource('전체');setInterest('전체');setChosenInterests(['사용자 이해','문제 정리']);setLinks(initialLinks);setSelectedNode(null);setSelectedLink(null);setDetailActivity(null);setEditor(null);setInterestsOpen(false);setInfo(false);setAnalysis('완료');setQueued('새 비공개 분석 대기 없음');setReflectId('e2');setCacheLabel('예시 프로필 v0.2 · 실제 분석 미수행');};
  const homeActivities = [...initialActivities].sort((a,b)=>Number(chosenInterests.includes(b.interest))-Number(chosenInterests.includes(a.interest)));
  const filtered = initialActivities.filter(a=>(source==='전체'||source===a.source)&&(interest==='전체'||interest===a.interest));

  return <div className="app">
    <aside className="sidebar" aria-label="화면 이동"><div className="brand"><Icon name="leaf" size={34}/><span><small>SKKU · COMPANION</small><b>킹고 컴패니언</b></span></div><nav>{routes.map(r=><button key={r.id} className={route===r.id?'active':''} aria-current={route===r.id?'page':undefined} onClick={()=>go(r.id)}><Icon name={r.icon}/><span>{r.label}</span>{route===r.id&&<i/>}</button>)}</nav><div className="side-actions"><button onClick={()=>setInterestsOpen(true)}>관심사 설정</button><button onClick={()=>setInfo(true)}>데모 안내</button></div><div className="side-version">와이어프레임 v0.4 · 예시 데이터</div></aside>
    <div className="workspace"><header className="topbar"><span>예시 데이터 · 실제 AI 미연결 · 새로고침 시 초기화</span><div><button className="ghost" onClick={()=>setInterestsOpen(true)}>관심사</button><button className="ghost" onClick={()=>setInfo(true)}>정보</button><button className="ghost" onClick={reset}><Icon name="reset"/>초기화</button></div></header><main>
      {route==='home'&&<Home go={go} patterns={hypotheses} activities={homeActivities} bookmarks={bookmarks} toggleBookmark={toggleBookmark} openActivity={setDetailActivity} chosen={chosenInterests} cacheLabel={cacheLabel} queued={queued}/>}
      {route==='map'&&<MapScreen nodes={nodes} links={activeLinks} experiences={experiences} openNode={setSelectedNode} openLink={openConnection} go={go}/>}
      {route==='explore'&&<Explore activities={filtered} bookmarks={bookmarks} toggleBookmark={toggleBookmark} openActivity={setDetailActivity} source={source} setSource={setSource} interest={interest} setInterest={setInterest} chosen={chosenInterests}/>}
      {route==='archive'&&<Archive experiences={experiences} edit={setEditor} remove={removeExperience} reflect={openReflection}/>}
      {route==='reflection'&&(currentExp?<Reflection key={currentExp.id} experience={currentExp} experiences={experiences} select={setReflectId} save={saveExperience}/>:<Empty title="회고할 경험이 아직 없어요" text="경험을 먼저 추가하면 사실을 바탕으로 회고할 수 있어요." action={()=>go('archive')} label="경험 추가하러 가기"/>)}
      {route==='data'&&<DataAnalysis analysis={analysis} queued={queued} start={()=>setAnalysis('진행 중')} finish={finishAnalysis}/>}
    </main></div>
    {selectedNode&&<Modal title={selectedNode.label} close={()=>setSelectedNode(null)}><NodeDetail node={selectedNode} experience={experiences.find(e=>e.id===selectedNode.expId)} reflect={openReflection}/></Modal>}
    {selectedLink&&<Modal title={selectedLink.status==='proposed'?'제안된 연결 확인':'확인된 연결 편집'} close={()=>setSelectedLink(null)}><div className="tag-row"><span>{selectedLink.status==='proposed'?'확인 전 가설':'확인된 관계 · 샘플'}</span><span>학생이 수정·제거 가능</span></div><p style={{marginTop:18}}>{selectedLink.question||'기록에 맞게 연결 설명과 근거를 수정할 수 있어요.'}</p><p className="muted">같은 관심으로 참여했는지, 팀의 필요로 맡았는지도 구분해 주세요. 제안 자체가 능력의 증거는 아닙니다.</p><label className="field">연결 내용<input value={connectionText} onChange={e=>setConnectionText(e.target.value)}/></label><label className="field">근거·수정 메모<textarea value={connectionNote} onChange={e=>setConnectionNote(e.target.value)} placeholder="실제로 연결된 이유나 다른 해석을 적어주세요."/></label><div className="modal-actions"><button onClick={()=>{setLinks(old=>old.filter(l=>l.id!==selectedLink.id));queue('연결 제거');setSelectedLink(null);}}>연결 제거</button><button className="primary" disabled={!connectionText.trim()} onClick={()=>{setLinks(old=>old.map(l=>l.id===selectedLink.id?{...l,status:'confirmed',label:connectionText.trim(),note:connectionNote}:l));queue('학생이 확인한 연결');setSelectedLink(null);}}>{selectedLink.status==='proposed'?'확인하고 연결 반영':'수정 사항 반영'}</button></div></Modal>}
    {detailActivity&&<Modal title={detailActivity.title} close={()=>setDetailActivity(null)}><ActivityDetail activity={detailActivity} saved={bookmarks.includes(detailActivity.id)} toggle={()=>toggleBookmark(detailActivity.id)}/></Modal>}
    {editor&&<ExperienceEditor experience={editor} close={()=>setEditor(null)} save={saveExperience}/>}
    {interestsOpen&&<Modal title="관심사 설정" close={()=>setInterestsOpen(false)}><p className="muted">관심을 바꿔보며 다음에 탐색할 경험을 골라요. 확정된 성향 판정이 아닙니다.</p><div className="choice-grid">{interests.map(i=><button key={i} className={chosenInterests.includes(i)?'selected':''} aria-pressed={chosenInterests.includes(i)} onClick={()=>setChosenInterests(old=>old.includes(i)?old.filter(x=>x!==i):[...old,i])}>{i}{chosenInterests.includes(i)&&<Icon name="check"/>}</button>)}</div><p className="muted">홈의 활동 예시를 관심 태그로 묶습니다. 실제 추천 엔진은 미선정이며 메모리 상태만 바뀝니다.</p><button className="primary full" onClick={()=>setInterestsOpen(false)}>관심사 반영</button></Modal>}
    {info&&<Modal title="데모와 데이터 안내" close={()=>setInfo(false)}><p>6개 화면은 가상 경험·공고와 React 메모리 상태로 구성했습니다. 실제 AI, 학교 계정, 외부 API, 크롤러, 데이터베이스, 영구 저장은 연결하지 않았습니다.</p><p>회고 답변은 예시 질문이며 분석 버튼은 상태만 바꿉니다. 홈 방문이나 일반 클릭으로 모델을 호출하지 않습니다.</p><p>공통 공고 분석과 개인 비공개 분석을 분리하는 설계입니다. 개인 원문·프로필·임베딩은 공통 데이터로 공유하지 않습니다.</p><p>역량 점수·순위·성격·직업 적합성 판정은 제공하지 않습니다. 연결과 패턴은 근거를 확인할 수 있는 가설입니다.</p><p className="subtle-warning">새로고침 또는 초기화하면 저장한 예시 기록·관심 활동·연결 변경이 사라집니다.</p><div className="modal-actions"><button onClick={reset}>데모 초기화</button><button className="primary" onClick={()=>setInfo(false)}>확인</button></div></Modal>}
  </div>;
}

function Home({go,patterns,activities,bookmarks,toggleBookmark,openActivity,chosen,cacheLabel,queued}:{go:(r:Route)=>void;patterns:typeof hypotheses;activities:Activity[];bookmarks:string[];toggleBookmark:(id:string)=>void;openActivity:(a:Activity)=>void;chosen:string[];cacheLabel:string;queued:string}) {
  return <><PageTitle eyebrow="GROWTH HOME" title="내 경험에서 다음을 발견해요" subtitle="무엇에 몰입했고 어떤 역할을 맡았는지, 근거부터 살펴봐요." action={<button className="primary" onClick={()=>go('map')}>경험 지도 보기<Icon name="arrow"/></button>}/><section className="hero-grid"><div className="panel"><div className="panel-head"><h2>근거 기반 패턴 가설</h2><span className="pill">예시 해석 · 학생 확인 전</span></div><div className="hypothesis-list">{patterns.map(p=><article key={p.title}><b>{p.title}</b><p>{p.note}</p><div>{p.links.map(l=><button key={l} onClick={()=>go('map')}>{l}<Icon name="arrow" size={12}/></button>)}</div></article>)}</div></div><div className="panel mini-map"><MiniGraph/><button onClick={()=>go('map')}>경험과 결과물 연결 보기<Icon name="arrow"/></button><small>실선은 확인, 점선은 연결 제안</small></div></section><div className="section-head"><h2>다음에 탐색할 활동 예시</h2><button onClick={()=>go('explore')}>전체 활동 보기<Icon name="arrow" size={15}/></button></div><div className="interest-tags">{chosen.length?chosen.map(i=><span key={i}>{i}</span>):<span>관심 미확인 · 탐색 중</span>}<span>관심 태그 데모 · 추천 방식 미선정</span></div><div className="cards three">{activities.slice(0,3).map((a,i)=><ActivityCard key={a.id} activity={a} saved={bookmarks.includes(a.id)} open={()=>openActivity(a)} toggle={()=>toggleBookmark(a.id)} tone={i}/>)}</div><section className="status-grid"><div className="panel"><small>마지막 완료 분석</small><h3>{cacheLabel}</h3><p>저장된 예시 해석을 조회하며 홈 방문은 모델을 호출하지 않습니다.</p></div><div className="panel"><small>새 기록의 비공개 분석</small><h3>{queued}</h3><p>기존 해석과 새 분석 대기를 나누어 보여줍니다.</p></div></section></>;
}

function MapScreen({nodes,links,experiences,openNode,openLink,go}:{nodes:NodeItem[];links:LinkItem[];experiences:Experience[];openNode:(n:NodeItem)=>void;openLink:(l:LinkItem)=>void;go:(r:Route)=>void}) {
  const [kind,setKind]=useState<NodeKind|'전체'>('전체');
  const visible=nodes.filter(n=>kind==='전체'||n.kind===kind);
  const visibleIds=new Set(visible.map(n=>n.id));
  const lookup=Object.fromEntries(nodes.map(n=>[n.id,n]));
  const shownLinks=links.filter(l=>visibleIds.has(l.from)&&visibleIds.has(l.to));
  const height=Math.max(520,...nodes.map(n=>n.y*5.2+65));
  const activate=(e:React.KeyboardEvent,action:()=>void)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}};
  return <><PageTitle eyebrow="EXPERIENCE GRAPH" title="경험과 근거의 연결" subtitle="활동 이름이 아닌, 직접 한 행동과 남긴 결과물을 연결해요." action={<button className="primary" onClick={()=>go('archive')}><Icon name="plus"/>경험 관리</button>}/><div className="filter-row">{(['전체','experience','artifact','reflection'] as const).map(k=><button key={k} className={kind===k?'selected':''} aria-pressed={kind===k} onClick={()=>setKind(k)}>{k==='전체'?'전체':kindLabels[k]}</button>)}<span className="legend"><i className="solid"/>확인된 관계</span><span className="legend"><i className="dashed"/>연결 제안</span><span className="pill">예시 경험 지도</span></div><section className="graph-panel" aria-label="경험 관계 지도"><svg viewBox={'0 0 1000 '+height} role="group" aria-label="노드와 연결을 선택해 근거 확인">{shownLinks.map(l=>{const a=lookup[l.from],b=lookup[l.to];return <g key={l.id} className={'edge '+l.status} role="button" tabIndex={0} aria-label={'연결 편집: '+linkLabel(l)} onClick={()=>openLink(l)} onKeyDown={e=>activate(e,()=>openLink(l))}><line className="edge-hit" x1={a.x*10} y1={a.y*5.2} x2={b.x*10} y2={b.y*5.2}/><line x1={a.x*10} y1={a.y*5.2} x2={b.x*10} y2={b.y*5.2}/><text textAnchor="middle" x={(a.x+b.x)*5} y={(a.y+b.y)*2.6-12}>{linkLabel(l)}</text></g>;})}{visible.map(n=><g key={n.id} className={'node '+n.kind} role="button" tabIndex={0} aria-label={'근거 보기: '+n.label} onClick={()=>openNode(n)} onKeyDown={e=>activate(e,()=>openNode(n))}>{n.kind==='artifact'?<rect x={n.x*10-29} y={n.y*5.2-29} width="58" height="58" rx="14"/>:<circle cx={n.x*10} cy={n.y*5.2} r="29"/>}<text textAnchor="middle" x={n.x*10} y={n.y*5.2+5} style={{fontSize:11,stroke:'none'}}>{kindLabels[n.kind]}</text><text textAnchor="middle" x={n.x*10} y={n.y*5.2+51}>{n.label}</text></g>)}</svg></section><div className="relation-list" aria-label="연결 목록">{links.map(l=><button key={l.id} className={l.status} onClick={()=>openLink(l)}><i/><span>{linkLabel(l)}</span><small>{l.status==='confirmed'?'확인됨 · 편집':'제안됨 · 확인'}</small></button>)}</div><div className="section-head"><h2>연결을 뒷받침하는 기록</h2><span className="muted">없는 기록은 낮은 능력이 아니라 미확인</span></div><div className="cards three">{experiences.map((e,i)=><article className="panel evidence" key={e.id}><Thumb tone={i}/><small>{e.type} · {e.period}</small><h3>{e.title}</h3><blockquote>{e.quote||'근거 문장 미확인'}</blockquote><button onClick={()=>{const n=nodes.find(n=>n.expId===e.id);if(n)openNode(n);}}>개인 역할·행동 보기</button></article>)}</div>{experiences.length===0&&<Empty title="아직 경험이 없어요" action={()=>go('archive')} label="경험 추가"/>}<p className="muted">확인 상태도 샘플 데이터입니다. 연결 개수·노드 크기·활동 수를 능력 점수로 사용하지 않습니다.</p></>;
}

function Explore({activities,bookmarks,toggleBookmark,openActivity,source,setSource,interest,setInterest,chosen}:{activities:Activity[];bookmarks:string[];toggleBookmark:(id:string)=>void;openActivity:(a:Activity)=>void;source:string;setSource:(s:string)=>void;interest:string;setInterest:(s:string)=>void;chosen:string[]}) {
  return <><PageTitle eyebrow="ACTIVITY DISCOVERY" title="활동 탐색" subtitle="지원 조건과 원문을 먼저 확인하고, 다음에 해볼 경험을 골라요." action={<span className="pill">추천 엔진 미선정 · 비교 예정</span>}/><div className="filter-row">{['전체',...interests].map(i=><button key={i} className={interest===i?'selected':''} aria-pressed={interest===i} onClick={()=>setInterest(i)}>{i}</button>)}<select aria-label="출처 필터" value={source} onChange={e=>setSource(e.target.value)}>{sources.map(s=><option key={s}>{s}</option>)}</select></div><p className="muted">선택 관심사: {chosen.join(', ')||'아직 미확인'}. 가상 공고이며 실제 지원 조건·마감 검증은 연결하지 않았습니다.</p><div className="cards three">{activities.map((a,i)=><ActivityCard key={a.id} activity={a} saved={bookmarks.includes(a.id)} open={()=>openActivity(a)} toggle={()=>toggleBookmark(a.id)} tone={i}/>)}</div>{activities.length===0&&<Empty title="조건에 맞는 예시가 없어요" action={()=>{setSource('전체');setInterest('전체');}} label="필터 초기화"/>}</>;
}

function Archive({experiences,edit,remove,reflect}:{experiences:Experience[];edit:(e:Experience)=>void;remove:(id:string)=>void;reflect:(id:string)=>void}) {
  const [filter,setFilter]=useState('전체');
  const [view,setView]=useState<'gallery'|'timeline'>('gallery');
  const filtered=experiences.filter(e=>filter==='전체'||e.type===filter);
  const newExperience:Experience={id:'',title:'',type:'프로젝트',role:'',action:'',result:'',reflection:'',quote:'',period:'새 기록'};
  return <><PageTitle eyebrow="ACTIVITY ARCHIVE" title="활동 아카이브" subtitle="잘된 일뿐 아니라 어려웠던 경험과 배움도 남겨요." action={<button className="primary" onClick={()=>edit(newExperience)}><Icon name="plus"/>경험 추가</button>}/><div className="filter-row">{['전체','교과','프로젝트','비교과'].map(f=><button key={f} className={filter===f?'selected':''} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f}</button>)}<span className="pill">내 기록 {experiences.length}개</span><button className={view==='gallery'?'selected':''} aria-pressed={view==='gallery'} onClick={()=>setView('gallery')}>갤러리</button><button className={view==='timeline'?'selected':''} aria-pressed={view==='timeline'} onClick={()=>setView('timeline')}>타임라인</button></div><div className={view==='gallery'?'archive-grid':'timeline'}>{filtered.map((e,i)=><article className="archive-card" key={e.id}><Thumb tone={i}/><div><small>{e.type} · {e.period}</small><h3>{e.title}</h3><p>{e.action||'직접 한 행동 미확인'}</p><blockquote>{e.learn||e.reflection||'아직 회고를 남기지 않았어요.'}</blockquote><div className="card-actions"><button onClick={()=>edit(e)}><Icon name="edit"/>편집</button><button onClick={()=>reflect(e.id)}><Icon name="chat"/>회고 작성</button><button onClick={()=>remove(e.id)}><Icon name="trash"/>삭제</button></div></div></article>)}</div>{filtered.length===0&&<Empty title="이 유형의 기록이 없어요" action={()=>edit(newExperience)} label="경험 추가"/>}<p className="muted" style={{marginTop:20}}>메모리 저장 데모입니다. 수정·삭제는 지도에도 반영되고 개인 분석 대기 상태를 갱신합니다.</p></>;
}

type ReflectionFacts={role:string;action:string;result:string;learn:string};
function Reflection({experience,experiences,select,save}:{experience:Experience;experiences:Experience[];select:(id:string)=>void;save:(e:Experience)=>void}) {
  const [step,setStep]=useState(0);
  const [facts,setFacts]=useState<ReflectionFacts>({role:experience.role,action:experience.action,result:experience.result,learn:experience.learn||experience.reflection});
  const [ready,setReady]=useState(false);
  const [draft,setDraft]=useState('');
  const [saved,setSaved]=useState(false);
  const prompts=['어떤 역할을 직접 맡았나요? 이미 적은 내용이 맞는지 확인해 주세요.','실제로 한 행동과 결과를 나누어 적어주세요. 결과가 없으면 비워둘 수 있어요.','무엇을 배웠고 다음에는 무엇을 바꾸고 싶나요? 사실에 맞는 한 문장을 남겨요.'];
  const update=(k:keyof ReflectionFacts,v:string)=>{setFacts(f=>({...f,[k]:v}));setReady(false);setSaved(false);setDraft('');};
  const next=()=>{if(step<2)setStep(s=>s+1);else{setDraft([facts.role&&'역할: '+facts.role,facts.action&&'행동: '+facts.action,facts.result&&'결과: '+facts.result,facts.learn&&'배운 점: '+facts.learn].filter(Boolean).join('\n'));setReady(true);}};
  const valid=step===0?facts.role.trim():step===1?facts.action.trim():facts.learn.trim();
  return <><PageTitle eyebrow="REFLECTION HELPER" title="회고 도우미" subtitle="짧은 질문으로 사실을 확인하고, 내가 고친 회고를 저장해요." action={<span className="pill">경량 모델 역할 모사 · 실제 AI 미연결</span>}/><section className="reflection-grid"><div className="panel"><label className="field">회고할 경험<select value={experience.id} onChange={e=>select(e.target.value)}>{experiences.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label><Thumb tone={2}/><h3>{experience.title}</h3><p>{experience.action||'직접 한 행동은 아직 미확인입니다.'}</p><blockquote>{experience.quote||'근거 문장 미확인'}</blockquote><p className="muted">기존 예시 기록을 불러왔습니다. AI가 새 사실을 만든 것이 아닙니다.</p></div><div className="panel helper"><div className="stepper">{['역할','행동·결과','배운 점'].map((l,i)=><span key={l} className={step===i?'current':''}><b>{i+1}</b>{l}</span>)}</div><div className="messages"><p className="bubble">{prompts[step]}</p></div><label className="field">맡은 역할<textarea value={facts.role} onChange={e=>update('role',e.target.value)} placeholder="내가 직접 맡은 역할"/></label><label className="field">직접 한 행동<textarea disabled={step<1} value={facts.action} onChange={e=>update('action',e.target.value)} placeholder="팀 전체가 아닌 나의 행동"/></label><label className="field">결과 또는 피드백<textarea disabled={step<1} value={facts.result} onChange={e=>update('result',e.target.value)} placeholder="없거나 아직 모르면 비워두세요"/></label><label className="field">배운 점<textarea disabled={step<2} value={facts.learn} onChange={e=>update('learn',e.target.value)} placeholder="다음 경험에 가져갈 한 가지"/></label><button className="primary" disabled={!valid||ready} onClick={next}>{step===2?(ready?'초안 생성됨':'회고 초안 만들기'):'다음 질문'}</button></div></section><section className="panel"><div className="panel-head"><h2>편집 가능한 회고 초안</h2><span className="pill">입력한 사실만 조합</span></div><textarea className="draft-editor" aria-label="회고 초안" disabled={!ready} value={draft} onChange={e=>{setDraft(e.target.value);setSaved(false);}} placeholder="세 단계의 질문을 확인하면 초안이 여기에 나타나요."/><p className="muted">구조화된 사실과 직접 수정한 회고를 함께 저장합니다. 경험을 바꾸거나 화면을 이동하면 미저장 입력은 초기화됩니다.</p><button className="primary" disabled={!ready||!draft.trim()} onClick={()=>{save({...experience,...facts,reflection:draft,quote:facts.learn||experience.quote});setSaved(true);}}>확인하고 회고 저장</button>{saved&&<p className="saved-note">회고 저장됨 · 개인 비공개 분석 대기 상태가 갱신되었습니다. 실제 모델은 호출하지 않았습니다.</p>}</section></>;
}

function DataAnalysis({analysis,queued,start,finish}:{analysis:AnalysisState;queued:string;start:()=>void;finish:()=>void}) {
  const publicSteps=['허용된 전체 공고 수집','원문·출처·접근 범위 보관','정규화·중복 제거','대형 모델 비동기 분석','근거·조건·마감 검증','공통 DB·임베딩·캐시 저장','신규·내용/분석 버전 변경만 갱신'];
  const privateSteps=['확인된 경험·회고 저장','동의 확인·사용자별 격리','변경을 묶어 비공개 분석 큐','대형 모델로 패턴·관계 분석','근거·불확실성·버전 저장','개인 캐시 조회·추천에 재사용','정정·삭제·철회 파생 데이터에 전파'];
  return <><PageTitle eyebrow="DATA AND ANALYSIS" title="데이터·분석 설계" subtitle="공통 공고는 재사용하고, 학생의 분석과 임베딩은 비공개로 분리해요." action={<span className="pill">설계 예시 · 운영 API 미연결</span>}/><section className="panel"><div className="panel-head"><h2>개인 분석 상태 예시</h2><span className="pill">{analysis}</span></div><p className="muted">{queued}</p><div className="analysis-control"><button disabled={analysis!=='대기'} onClick={start}>분석 시작 시뮬레이션</button><button className="primary" disabled={analysis!=='진행 중'} onClick={finish}>분석 완료 시뮬레이션</button></div><p className="muted" style={{margin:'14px 0 0'}}>버튼은 상태만 바꿉니다. 실제 분석·프로필 생성·모델 호출·비용 측정은 수행하지 않습니다.</p></section><section className="lanes"><div className="panel lane"><h2>공통 모집글 ETL</h2>{publicSteps.map((s,i)=><div className="lane-step" key={s}><span>{i+1}</span><b>{s}</b><small>{i===6?'최초 전수 분석 뒤 증분 갱신':'공개 또는 동일한 접근 권한 범위에서만 공유'}</small></div>)}</div><div className="panel lane private"><h2>학생별 비공개 분석</h2>{privateSteps.map((s,i)=><div className="lane-step" key={s}><span>{i+1}</span><b>{s}</b><small>개인 원문·프로필·임베딩·추천 이력은 사용자별 분리</small></div>)}</div></section><div className="cards four">{sources.slice(1).map((s,i)=><article className="panel source-card" key={s}><span>{['학','과','C','외'][i]}</span><h3>{s}</h3><p>원문 URL·지원 조건·마감·확인일·출처를 검증한 뒤 연결 예정</p></article>)}</div><section className="panel"><div className="panel-head"><h2>추천 방식 비교 후보</h2><span className="pill">미선정 · 비교 예정 · 미실측</span></div><div className="cards four compact">{['규칙·태그·BM25','임베딩 유사도','하이브리드 검색','경량 LLM 재정렬'].map(s=><article key={s}><h3>{s}</h3><p>정제 데이터에 대한 품질·비용·지연·운영 난이도 비교</p></article>)}</div><div className="engine-note">조건·마감·취소 필터 우선 → 관련 후보 검색 → 선택적 재정렬 → 근거 설명. Recall@K·NDCG@K와 조건 위반, 설명의 사실성, p95 지연·요청당 비용을 나누어 평가합니다.</div><p className="muted" style={{margin:'16px 0 0'}}>회고 3B/8B 후보·대형 분석 모델·GPU/API 환경·평가셋·예산은 미확정입니다. 비동기 자체가 저비용을 보장하지 않으며 최초 전수와 증분 운영 비용을 구분합니다.</p></section><details className="panel details"><summary>동의·삭제·공통 데이터의 범위</summary><p>목적별 동의·최소 수집·열람·정정·삭제·철회를 적용합니다. 개인 분석을 다른 학생·교수·운영자에게 기본 공개하지 않습니다.</p><p>학생 기록이 삭제되면 개인 분석·임베딩·관계·캐시에도 전파하는 설계입니다. 교내 제한 공고를 공개 인덱스에 섞지 않습니다. 실제 삭제 작업은 연결하지 않았습니다.</p></details></>;
}

function ActivityCard({activity,saved,open,toggle,tone}:{activity:Activity;saved:boolean;open:()=>void;toggle:()=>void;tone:number}) {
  return <article className="activity-card"><button className="thumb-btn" aria-label={activity.title+' 상세 보기'} onClick={open}><Thumb tone={tone}/><span>가상 공고 · 실제 연동 전</span></button><button className={'bookmark '+(saved?'saved':'')} aria-label={(saved?'저장 취소: ':'관심 활동 저장: ')+activity.title} aria-pressed={saved} onClick={toggle}><Icon name="bookmark"/></button><div><small>{activity.source} · {activity.kind}</small><h3><button onClick={open}>{activity.title}</button></h3><p>{activity.reason}</p><div className="tag-row"><span>{activity.interest}</span><span>추정 · 성과 보장 아님</span></div></div></article>;
}

function ActivityDetail({activity,saved,toggle}:{activity:Activity;saved:boolean;toggle:()=>void}) {
  return <><Thumb tone={1}/><div className="tag-row"><span>{activity.source}</span><span>{activity.interest}</span><span>가상 공고</span></div><dl className="detail-list"><div><dt>실제 과업 예시</dt><dd>{activity.task}</dd></div><div><dt>남길 결과물</dt><dd>{activity.deliverable}</dd></div><div><dt>필요한 준비</dt><dd>{activity.prerequisite} · 실제 지원 자격 미검증</dd></div><div><dt>마감</dt><dd>{activity.deadline}</dd></div><div><dt>출처·확인일</dt><dd>{activity.source} · {activity.checked}</dd></div><div><dt>원문 URL</dt><dd>가상 공고이므로 실제 원문 URL이 없습니다.</dd></div><div><dt>연결 이유</dt><dd>{activity.reason}</dd></div></dl><p className="muted">기대 배움은 경험 기반 추정입니다. 합격·성과·역량 획득을 보장하지 않습니다. 실제 추천 방식은 실험 후 선정합니다.</p><button className="primary full" onClick={toggle}>{saved?'관심 활동 저장 취소':'관심 활동 저장'}</button></>;
}

function NodeDetail({node,experience,reflect}:{node:NodeItem;experience?:Experience;reflect:(id:string)=>void}) {
  return <><div className="tag-row"><span>{kindLabels[node.kind]}</span><span>예시 근거 기록</span></div>{experience?<><h3 style={{marginTop:18}}>{experience.title}</h3><blockquote>{experience.quote||'근거 문장 미확인'}</blockquote><dl className="detail-list"><div><dt>개인 역할</dt><dd>{experience.role||'미확인'}</dd></div><div><dt>직접 한 행동</dt><dd>{experience.action||'미확인'}</dd></div><div><dt>결과·피드백</dt><dd>{experience.result||'미확인'}</dd></div><div><dt>배운 점</dt><dd>{experience.learn||experience.reflection||'미확인'}</dd></div></dl><p className="muted">팀 결과를 개인 능력으로 그대로 해석하지 않습니다. 실제 파일 업로드나 모델 판정은 연결하지 않았습니다.</p><button className="primary full" onClick={()=>reflect(experience.id)}>이 경험으로 회고 작성</button></>:<p>연결된 원문이 없어 미확인 상태입니다.</p>}</>;
}

function ExperienceEditor({experience,close,save}:{experience:Experience;close:()=>void;save:(e:Experience)=>void}) {
  const [draft,setDraft]=useState({...experience});
  const update=(k:keyof Experience,v:string)=>setDraft(e=>({...e,[k]:v}));
  return <Modal title={experience.id?'경험 편집':'경험 추가'} close={close}><div className="editor-grid"><label className="field">제목<input value={draft.title} onChange={e=>update('title',e.target.value)} placeholder="내가 참여한 경험"/></label><label className="field">유형<select value={draft.type} onChange={e=>update('type',e.target.value)}><option>교과</option><option>프로젝트</option><option>비교과</option></select></label><label className="field">기간<input value={draft.period} onChange={e=>update('period',e.target.value)}/></label><label className="field">개인 역할<input value={draft.role} onChange={e=>update('role',e.target.value)}/></label><label className="field">직접 한 행동<textarea value={draft.action} onChange={e=>update('action',e.target.value)}/></label><label className="field">결과·피드백<textarea value={draft.result} onChange={e=>update('result',e.target.value)}/></label><label className="field">회고<textarea value={draft.reflection} onChange={e=>update('reflection',e.target.value)}/></label><label className="field">근거 문장<textarea value={draft.quote} onChange={e=>update('quote',e.target.value)} placeholder="직접 작성한 문장 또는 확인할 원문 발췌"/></label></div><p className="muted">모르는 사실은 비워둘 수 있어요. 새 기록은 연결을 자동 확정하지 않습니다.</p><button className="primary full" disabled={!draft.title.trim()} onClick={()=>save(draft)}>확인하고 경험 저장</button></Modal>;
}

function PageTitle({eyebrow,title,subtitle,action}:{eyebrow:string;title:string;subtitle?:string;action?:ReactNode}) {return <div className="page-title"><div><small>{eyebrow}</small><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>;}
function Empty({title,text,action,label}:{title:string;text?:string;action:()=>void;label:string}) {return <div className="empty"><Icon name="archive" size={42}/><h2>{title}</h2>{text&&<p>{text}</p>}<button onClick={action}>{label}</button></div>;}
function MiniGraph(){return <svg className="mini-graph" viewBox="0 0 260 170" role="img" aria-label="활동·결과물·회고의 연결 요약"><path d="M53 48 130 82 203 45M130 82 74 130" stroke="#124633" strokeWidth="2.5" fill="none"/><path d="M130 82l72 44" stroke="#889e7d" strokeWidth="2.5" strokeDasharray="7 7" fill="none"/><circle cx="53" cy="48" r="23"/><circle cx="130" cy="82" r="28"/><circle cx="203" cy="45" r="20"/><circle cx="74" cy="130" r="18"/><circle cx="202" cy="126" r="18"/></svg>;}
function Modal({title,close,children}:{title:string;close:()=>void;children:ReactNode}) {
  const ref=useRef<HTMLElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;ref.current?.querySelector<HTMLElement>('button,input,textarea,select')?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const all=Array.from(ref.current?.querySelectorAll<HTMLElement>('button,input,textarea,select,a,[tabindex="0"]')||[]).filter(el=>!el.hasAttribute('disabled'));const first=all[0],last=all[all.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus();};},[]);
  return <div className="modal-backdrop" onMouseDown={close}><section ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button className="icon-btn" aria-label="닫기" onClick={close}><Icon name="close"/></button></div>{children}</section></div>;
}
