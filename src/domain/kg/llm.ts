import { KG_LLM_LINKS, KG_LLM_NAMES, type LlmLinkSeed, type LlmNameSeed } from '../../data/kgLlmLinks';
import type { RecordItem } from '../types';

// LLM 이 하는 두 가지 일의 경계. 나중에 실제 모델을 같은 모양으로 꽂는다.
// 1) 회고 문장 사이 의미 관계(엣지) 2) 사전에 맞지 않는 묶음의 이름 후보.

export type LlmLink = { a: string; b: string; confidence: number; reason: string };
export type LlmName = { name: string; summary: string };

export interface LlmProvider {
  /** 기록 사이 의미 관계. 없는 기록을 가리키는 것은 돌려주지 않는다 */
  links(records: RecordItem[]): LlmLink[];
  /** 묶음 이름 후보. 대표 단어(terms)를 함께 넘긴다. 못 지으면 null */
  nameCluster(memberIds: string[], terms: string[]): LlmName | null;
}

/** 두 집합이 얼마나 겹치나(자카드) */
const jaccard = (a: string[], b: string[]) => {
  const B = new Set(b);
  const inter = a.filter(x => B.has(x)).length;
  return inter / (new Set([...a, ...b]).size || 1);
};

/**
 * 모의 LLM: 미리 넣어 둔 값(kgLlmLinks)을 돌려준다. 이름은 본 활동과 묶음이 절반 가까이(자카드 0.4 이상) 겹칠 때만 그 후보를,
 * 아니면 대표 단어 둘로 '○○·○○ 활동' 을 짓는다(실제 LLM 이 하는 일을 가장 단순하게 흉내 낸다).
 */
export function mockLlm(links: LlmLinkSeed[] = KG_LLM_LINKS, names: LlmNameSeed[] = KG_LLM_NAMES): LlmProvider {
  return {
    links(records) {
      const ids = new Set(records.map(r => r.id));
      return links.filter(l => ids.has(l.a) && ids.has(l.b) && l.a !== l.b).map(l => ({ ...l }));
    },
    nameCluster(memberIds, terms) {
      const best = names
        .map(n => ({ n, j: jaccard(n.members, memberIds) }))
        .filter(x => x.j >= 0.4)
        .sort((x, y) => y.j - x.j)[0];
      if (best) return { name: best.n.name, summary: best.n.summary };
      if (terms.length === 0) return null;
      const top = terms.slice(0, 2);
      return { name: `${top.join('·')} 활동`, summary: `‘${top.join('’, ‘')}’ 이 자주 나오는 활동이에요` };
    }
  };
}

/** LLM 을 쓰지 않을 때(테스트, 끈 상태) */
export const NO_LLM: LlmProvider = { links: () => [], nameCluster: () => null };
