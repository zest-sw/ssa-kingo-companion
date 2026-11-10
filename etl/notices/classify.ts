// 공지 판정 규칙: 기회 여부·종류(제목과 게시판 분류만 본다), 주최. 근거 문자열은 data-model.md '근거에 쓰는 말'을 따른다.
import type { Category } from '../../src/domain/types.ts';

/** 화면 종류 9개에 ETL에만 있는 장학·교과를 더한다. 공용 타입 반영은 스펙 2 */
export type Kind = Category | 'scholarship' | 'course';

/** 앞 9개는 화면 CATEGORY_LABEL과 같아야 한다(classify.test.ts가 확인).
 *  그 모듈은 확장자 없는 import를 써서 Node가 직접 가져오지 못해 여기 다시 적는다. */
export const KIND_LABEL: Record<Kind, string> = {
  job: '채용', lecture: '특강', hackathon: '해커톤', contest: '대회·공모전', edu: '교육·캠프', club: '동아리·학회',
  volunteer: '봉사', mentoring: '멘토링', global: '글로벌', scholarship: '장학', course: '교과'
};

export type Judged =
  | { verdict: 'opportunity'; kind: Kind; rule: string }
  | { verdict: 'not'; rule: string }
  | { verdict: 'review'; why: string };

// ponytail: 단어표는 표본 294건 제목에서 출발했다(research R5). 개발용 정답셋으로 맞추고, 고칠 때마다 classify.test.ts에 한 줄 더한다

/** 뜻이 분명한 구만 둔다. '변경'·'시험'·'마감'은 모집글에도 상태 표시로 붙어서 넣지 않는다 */
// '반려'는 빼 두었다: 표본의 반려 글은 모두 '졸업평가'·'재업로드'로 걸리고, '반려동물' 모집글을 잘못 뺀다
const NOT_WORDS = [
  // 띄어 쓴 구는 붙여 써도 받는다('결과안내'). '점검'은 '포트폴리오 점검 멘토링'에도 붙어서 '점검 안내'만 본다
  '결과 안내', '결과 발표', '선발 결과', '최종 선발', '합격자', '명단', '배정', '수여식', '휴무', '단축 운영', '재업로드', '졸업평가', '수강신청', '성적우수', '점검 안내',
  '미제출자', '의무 수강', '성료', '예방교육', '인터뷰 참여', '설문',
  // spec 정답 기준 4·5(2026-11-08): 역량평가 응시, 간식 이벤트, 정부 지원 제도 안내는 기회가 아니다
  '정기평가', '푸드트럭', '국민취업지원제도'
];

/** 우선순위 순. 범위가 좁은 단어부터 보고, 꾸미는 말로 자주 쓰이는 넓은 단어(교육, 채용)는 뒤에 둔다.
 *  다른 낱말 안에 숨는 짧은 단어('어학'⊂소프트웨어학과, '토크'⊂아우토크립트, '과정', '교과목')는 쓰지 않는다. */
const KIND_WORDS: [Kind, (string | RegExp)[]][] = [
  ['hackathon', ['해커톤', '아이디어톤', '메이커톤', '데이터톤', '프롬프톤', '게임잼']],
  ['lecture', ['학술대회', '진학설명회', '챌린지스퀘어']], // '대회'·'학석사연계'·'챌린지'보다 먼저 본다
  ['global', ['글로벌 챌린지']], // 사업단의 해외 방문 프로그램. '챌린지'보다 먼저 본다
  ['contest', ['공모전', '경진대회', '경시대회', '대회', '챌린지', '콘테스트', 'ICPC']],
  ['mentoring', ['멘토링', '멘토', '멘티', '튜터']],
  ['scholarship', ['장학']],
  ['volunteer', ['봉사']],
  ['club', ['동아리', '학회', '소모임', '서포터즈', '기자단']],
  ['global', ['해외', '교환학생', '어학연수', '파견', '국외']],
  // 정답 기준 5: 산학협력프로젝트는 교과다. KAIST 몰입캠프는 학점교류 과목이라 '캠프'보다 먼저 본다
  ['course', ['마이크로디그리', '학부·대학원 연계과정', '학석사연계', '교과목 개설', '추가 개설', '산학협력프로젝트', '몰입캠프', '연구학점제']],
  ['lecture', ['투어', '탐방']], // 정답 기준 4: 기업·연구소 탐방은 특강이다. '[미래차부트캠프] … 투어'의 '캠프'보다 먼저 본다
  // 'SPARK 16기'처럼 기수가 붙을 때만 과정 이름이다(빅데이터 도구 Spark 특강과 가른다)
  ['edu', ['교육', '캠프', '아카데미', '스쿨', 'School', 'SSAFY', 'K-Digital', 'KDT', '마스터 클래스', '마스터클래스', '수강생', '양성', '과정 모집', /spark\s*\d+\s*기/]],
  // 정답 기준 2: 채용 공고에 곁들인 설명회는 채용이다('채용 및 …설명회', '채용 모집 + 채용설명회'). '설명회'·'Colloquium'보다 먼저 본다
  // ponytail: '채용 및 인턴십 설명회'처럼 설명회만 알리는 글도 채용으로 읽는다. 정답셋에서 틀리면 뒤에 설명회만 오는 꼴을 뺀다
  ['job', [/(?:채용|공채)\s*(?:모집\s*)?(?:및|\+|&)/, '도우미']],
  ['lecture', ['특강', '세미나', '콜로키움', 'Colloquium', '강연', '설명회', '워크숍', '워크샵', '포럼', 'Forum', '컨퍼런스', '웨비나', '콘서트', '잡페어', 'Job Cafe']],
  // '신입'은 '신입생'에, '경력'은 '경력개발'에 숨어서 쓰지 않는다. 채용 글에는 거의 '채용'·'공채'가 같이 있다
  ['job', ['채용', '인턴', '신입사원', '신입행원', '현장실습', '일경험', '직무 체험', '직무체험', '리크루팅', '공채', '인재영입', '인력 모집', '엔지니어', 'Engineer', 'Assistant 모집', '개발자', '연구원', '부감독', '조교']]
];

// ponytail: 짧은 종류 단어를 품은 낱말은 보이는 대로 여기에 더한다(FR-010)
/** 짧은 종류 단어를 품은 낱말: '대회'⊂대회의실(장소), '양성'⊂다양성, 'engineer'⊂engineering·'school'⊂school of(세미나 제목),
 *  '캠프'⊂미래차 부트캠프(사업 이름이라 세미나·설명회·투어 글에도 붙는다), '조교'⊂조교수(교원 초빙), '파견'⊂파견직 */
const HIDE = /대회의실|다양성|engineering|school of|미래차\s*부트캠프|조교수|파견직/g;

const RECRUIT = /모집|신청|참가/;

/** 종류 단어가 하나도 없을 때(FR-009) */
function byBoard(title: string, board: string): Judged {
  switch (board) {
    case '행사/세미나': return { verdict: 'opportunity', kind: 'lecture', rule: '게시판: 행사/세미나' };
    case '장학': return { verdict: 'opportunity', kind: 'scholarship', rule: '게시판: 장학' };
    case '학사':
    case '일반':
      return RECRUIT.test(title) ? { verdict: 'review', why: `모집 단어 있음 (${board})` } : { verdict: 'not', rule: `게시판: ${board}` };
    case '채용/모집':
    case '취업':
      return { verdict: 'review', why: `규칙에 안 걸림 (${board})` };
    default: // 분류 없이 올라온 글도 있다(표본 목록 300줄 중 7줄)
      return { verdict: 'review', why: board ? `처음 보는 게시판 (${board})` : '게시판 분류 없음' };
  }
}

/** 기회 아님 단어 → 종류 단어(우선순위) → 게시판 기본값. 먼저 걸린 것으로 정한다 */
export function classify(title: string, board: string): Judged {
  const t = title.toLowerCase().replace(HIDE, ' ');
  const not = NOT_WORDS.find(w => t.includes(w) || (w.includes(' ') && t.includes(w.replace(/ /g, ''))));
  if (not) return { verdict: 'not', rule: `기회 아님: ${not}` };
  for (const [kind, words] of KIND_WORDS)
    for (const w of words) {
      const hit = typeof w === 'string' ? (t.includes(w.toLowerCase()) ? w : null) : t.match(w)?.[0];
      if (hit) return { verdict: 'opportunity', kind, rule: `제목: ${hit}` };
    }
  return byBoard(title, board);
}

// ponytail: 주최는 제목에서만 찾는다(본문 49건에 '주최:' 줄이 없었다). 다른 출처를 붙일 때 본문 줄을 다시 본다
// 사업·과정 이름(캠프, 아카데미, 스쿨, 프로젝트)도 꼬리표로 본다: 여는 기관이 아니라서 맞히지 못할 바에는 비운다
const TAGS = ['특강', '세미나', '안내', '강연', '학기', '졸업', '모집', '인턴', '추천', '공고', '마감', '무료', '국비', '채용', '온라인', '캠프', '아카데미', '스쿨', '프로젝트'];
/** '공지'는 맨 앞(또는 '재공지')일 때만 꼬리표다('공지'⊂인공지능). 회차('75회'), 날짜('~11/15', '11.20(목)'), 연도('2025년 하계')도 꼬리표다 */
const isTag = (s: string) => TAGS.some(w => s.includes(w)) || /^재?공지|\d+\s*회|~|\d\s*[./]\s*\d|20\d\d/.test(s);

/** 제목 맨 앞 [대괄호]에서 꼬리표가 아닌 조각, 없으면 '○○ 주최', 그것도 없으면 null.
 *  대괄호는 / 나 | 로 나눠 꼬리표 조각을 뺀다: '[현대건설/신입채용]' → 현대건설, '[ESTsoft | 온라인]' → ESTsoft, '[한화시스템/방산]'은 그대로 */
export function hostOf(title: string): string | null {
  // 숫자 사이의 /는 날짜('~11/15')라서 나누지 않는다
  const parts = title.match(/^\s*\[([^\]]+)\]/)?.[1].split(/\||(?<!\d)\/|\/(?!\d)/).map(s => s.trim()).filter(s => s && !isTag(s)) ?? [];
  if (parts.length) return parts.join('/');
  return title.match(/(\S+)\s+(?:공동\s*)?주최/)?.[1] ?? null;
}
