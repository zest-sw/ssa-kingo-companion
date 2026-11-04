import { Drawer } from '../../components';
import { canFollow } from '../../domain/social/path';
import { SENIORS } from '../../data/friends';
import { PathTree } from './PathTree';

/** 선배 활동 경로 따라 보기(스팀 큐레이터 대신): 선배가 공개한 경로와 회고만. 결과를 견주지 않고 거쳐 온 길만 보인다. */
export function SeniorDrawer({ seniorId, onClose }: { seniorId: string | null; onClose: () => void }) {
  const s = seniorId ? SENIORS[seniorId] : undefined;
  const open = !!s && canFollow(s);
  return (
    <Drawer open={open} onClose={onClose} eyebrow={s && `${s.dept} ${s.year}학년`} title={s ? `${s.name} 선배의 경로` : ''}>
      {s && canFollow(s) && (
        <div className="fr-stack">
          <PathTree path={s.path} label={`${s.name} 선배가 거쳐 온 활동`} />
          {s.retro && <blockquote className="fr-quote"><span className="fr-quote__label">공개한 회고</span>{s.retro}</blockquote>}
          <p className="fr-empty">같은 길을 따라가야 하는 건 아니에요. 마음이 가는 활동 하나만 골라 봐도 돼요.</p>
        </div>
      )}
    </Drawer>
  );
}
