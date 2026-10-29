import type { ReactNode } from 'react';

const PATHS = {
  home: <><path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z" /></>,
  compass: <><circle cx="12" cy="12" r="8.5" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  board: <><rect x="4" y="4.5" width="4" height="15" rx="1.2" /><rect x="10" y="4.5" width="4" height="9" rx="1.2" /><rect x="16" y="4.5" width="4" height="6" rx="1.2" /></>,
  records: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M5 14.5h14" /></>,
  analysis: <><path d="M4 18.5 9.5 11l4 4L20 6.5" /><circle cx="9.5" cy="11" r="1" /><circle cx="13.5" cy="15" r="1" /></>,
  trophy: <><path d="M8 4.5h8v5a4 4 0 0 1-8 0z" /><path d="M8 6.5H5a3 3 0 0 0 3 3.5M16 6.5h3a3 3 0 0 1-3 3.5M12 13.5V17M8.5 20h7M10 17h4" /></>,
  friends: <><circle cx="9" cy="9" r="3" /><path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" /><circle cx="16.5" cy="9.5" r="2.5" /><path d="M16 14.5c2.3 0 4 1.2 4.5 4" /></>,
  leaf: <><path d="M12 20V11" /><path d="M12 11C9 11 5 9 4.5 4.5 9 4.5 12 7 12 11zM12 11c3 0 7-2 7.5-6.5C15 4.5 12 7 12 11z" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  flag: <path d="M5.5 21V4.5m0 0h11l-2.2 4 2.2 4h-11" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>,
  alert: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5.5M12 16.5h.01" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  back: <path d="M15 6l-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  pencil: <path d="M5 19h3.5L19 8.5 15.5 5 5 15.5zM13.5 7l3.5 3.5" />,
  external: <path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5" />,
  bell: <><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  doc: <><path d="M6.5 3.5h7l4 4v13h-11z" /><path d="M13.5 3.5v4h4M9 12h6M9 15.5h6" /></>,
  // '나만 본다': 잠금이 아니라 보는 사람이 나뿐이라는 뜻
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  refresh: <><path d="M19 12a7 7 0 1 1-2.05-4.95" /><path d="M19 4.5V8h-3.5" /></>,
  sparkle: <path d="M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z" />
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

/** 장식용 선 아이콘. 뜻을 전해야 하면 옆에 글자를 두거나 부모에 aria-label 을 단다. */
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
