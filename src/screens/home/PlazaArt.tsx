// 광장 문 카드의 건물 윤곽. 얇은 선만 쓰고 색 면은 문 한 칸(마우스를 올리면 살짝 밝아진다)뿐이다.
export type Building = 'board' | 'hall' | 'square';

const W = 120;
const H = 64;

export function PlazaArt({ kind }: { kind: Building }) {
  return (
    <svg className="home-art" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {kind === 'board' && (
        <g>
          {/* 게시판: 지붕 한 줄, 판, 붙은 종이 셋, 다리 둘 */}
          <path d="M28 14 L60 4 L92 14" />
          <rect x="30" y="14" width="60" height="32" />
          <rect className="home-art__door" x="36" y="20" width="14" height="18" />
          <rect x="54" y="20" width="14" height="10" />
          <rect x="72" y="20" width="12" height="20" />
          <path d="M38 46 V62 M82 46 V62 M18 62 H102" />
        </g>
      )}
      {kind === 'hall' && (
        <g>
          {/* 전당: 박공지붕, 기둥 넷, 가운데 문, 계단 둘 */}
          <path d="M22 18 L60 4 L98 18 Z" />
          <path d="M24 22 H96" />
          <path d="M30 22 V52 M44 22 V52 M76 22 V52 M90 22 V52" />
          <path className="home-art__door" d="M53 52 V34 a7 7 0 0 1 14 0 V52 Z" />
          <path d="M22 52 H98 M16 57 H104 M10 62 H110" />
        </g>
      )}
      {kind === 'square' && (
        <g>
          {/* 광장 게시판: 아치 문 둘이 있는 낮은 건물과 앞마당 선 */}
          <path d="M20 22 H100 M24 22 V52 M96 22 V52 M20 22 L30 12 H90 L100 22" />
          <path className="home-art__door" d="M40 52 V38 a8 8 0 0 1 16 0 V52 Z" />
          <path d="M64 52 V38 a8 8 0 0 1 16 0 V52 Z" />
          <path d="M14 52 H106 M30 62 H90" />
        </g>
      )}
    </svg>
  );
}
