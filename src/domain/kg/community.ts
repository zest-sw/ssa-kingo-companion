// 커뮤니티 탐지(Leiden 식). Traag 외(2019): Louvain 은 끊긴 커뮤니티를 만들 수 있어, Leiden 은 커뮤니티가 늘 연결되게 다듬는다.
// 우리 그래프는 노드 수십 개라 전체 Leiden 대신 '지역 이동(Louvain) → 끊긴 커뮤니티 쪼개기(연결 보장) → 묶어서 한 단계 위에서 다시'를
// 정해진 순서로 돈다. 같은 입력이면 같은 결과다(난수 없음).

export type WEdge = { a: string; b: string; w: number };

/**
 * 해상도 γ. 모듈러리티 이득 = k_i,in − γ·k_i·Σ_c / 2m. γ 가 크면 묶음이 잘게, 작으면 크게 나온다.
 * 기록 20~30개에 묶음 4~5개가 나오도록 1.0(표준 모듈러리티)을 쓴다. 너무 잘게 나오면 caller 가 작은 묶음부터 합친다.
 */
export const RESOLUTION = 1.0;

type G = { n: number; adj: Map<number, number>[]; self: number[]; k: number[]; m2: number };

function makeGraph(n: number, edges: { a: number; b: number; w: number }[]): G {
  const adj = Array.from({ length: n }, () => new Map<number, number>());
  const self = new Array(n).fill(0);
  for (const { a, b, w } of edges) {
    if (w <= 0) continue;
    if (a === b) { self[a] += w; continue; }
    adj[a].set(b, (adj[a].get(b) ?? 0) + w);
    adj[b].set(a, (adj[b].get(a) ?? 0) + w);
  }
  const k = adj.map((m, i) => [...m.values()].reduce((s, w) => s + w, 0) + 2 * self[i]);
  return { n, adj, self, k, m2: k.reduce((s, x) => s + x, 0) };
}

/** Louvain 지역 이동: 노드를 번호 순서로 돌며 이득이 가장 큰 이웃 커뮤니티로 옮긴다. 더 옮길 게 없을 때까지 */
function localMove(g: G, comm: number[], gamma: number): boolean {
  if (g.m2 === 0) return false;
  const tot = new Array(g.n).fill(0);
  for (let i = 0; i < g.n; i++) tot[comm[i]] += g.k[i];
  let movedAny = false;
  for (let pass = 0; pass < 50; pass++) {
    let moved = false;
    for (let i = 0; i < g.n; i++) {
      const own = comm[i];
      const toC = new Map<number, number>();
      for (const [j, w] of g.adj[i]) toC.set(comm[j], (toC.get(comm[j]) ?? 0) + w);
      tot[own] -= g.k[i];
      const gain = (c: number) => (toC.get(c) ?? 0) - (gamma * g.k[i] * tot[c]) / g.m2;
      let best = own, bestGain = gain(own);
      // 같은 이득이면 번호가 작은 커뮤니티(결정적)
      for (const c of [...toC.keys()].sort((x, y) => x - y)) {
        const v = gain(c);
        if (v > bestGain + 1e-12) { best = c; bestGain = v; }
      }
      tot[best] += g.k[i];
      if (best !== own) { comm[i] = best; moved = true; movedAny = true; }
    }
    if (!moved) break;
  }
  return movedAny;
}

/** Leiden 의 연결 보장: 커뮤니티 안에서 이어지지 않은 덩어리는 따로 쪼갠다 */
function splitDisconnected(g: G, comm: number[]): number[] {
  const out = new Array(g.n).fill(-1);
  let next = 0;
  for (let s = 0; s < g.n; s++) {
    if (out[s] !== -1) continue;
    const stack = [s];
    out[s] = next;
    while (stack.length) {
      const i = stack.pop()!;
      for (const j of g.adj[i].keys()) if (out[j] === -1 && comm[j] === comm[s]) { out[j] = next; stack.push(j); }
    }
    next++;
  }
  return out;
}

/** 커뮤니티 번호를 처음 나온 노드 순서로 0, 1, 2… 다시 매긴다 */
function renumber(comm: number[]): number[] {
  const map = new Map<number, number>();
  return comm.map(c => { if (!map.has(c)) map.set(c, map.size); return map.get(c)!; });
}

/**
 * 노드 id 목록과 무게 엣지로 커뮤니티를 찾는다. 돌려주는 값: 노드 id → 커뮤니티 번호(0부터, 노드 순서대로).
 * 엣지가 없는 노드는 혼자 커뮤니티가 된다.
 */
export function leiden(ids: string[], edges: WEdge[], gamma = RESOLUTION): Map<string, number> {
  const index = new Map(ids.map((id, i) => [id, i]));
  let g = makeGraph(ids.length, edges.filter(e => index.has(e.a) && index.has(e.b)).map(e => ({ a: index.get(e.a)!, b: index.get(e.b)!, w: e.w })));
  // member[i]: 원래 노드 i 가 지금 단계 그래프의 몇 번 노드인가
  let member = ids.map((_, i) => i);
  for (let level = 0; level < 10; level++) {
    const comm = g.adj.map((_, i) => i);
    const moved = localMove(g, comm, gamma);
    const refined = renumber(splitDisconnected(g, comm));
    const count = Math.max(-1, ...refined) + 1;
    if (!moved || count === g.n) { member = member.map(m => refined[m]); break; }
    member = member.map(m => refined[m]);
    // 한 단계 위 그래프: 커뮤니티 하나가 노드 하나
    const agg: { a: number; b: number; w: number }[] = [];
    for (let i = 0; i < g.n; i++) {
      if (g.self[i]) agg.push({ a: refined[i], b: refined[i], w: g.self[i] });
      for (const [j, w] of g.adj[i]) if (i < j) agg.push({ a: refined[i], b: refined[j], w });
    }
    g = makeGraph(count, agg);
  }
  const final = renumber(member);
  return new Map(ids.map((id, i) => [id, final[i]]));
}

/** 모듈러리티(테스트·비교용) */
export function modularity(ids: string[], edges: WEdge[], comm: Map<string, number>, gamma = RESOLUTION): number {
  const k = new Map<string, number>();
  let m2 = 0;
  for (const e of edges) { k.set(e.a, (k.get(e.a) ?? 0) + e.w); k.set(e.b, (k.get(e.b) ?? 0) + e.w); m2 += 2 * e.w; }
  if (m2 === 0) return 0;
  let inW = 0;
  for (const e of edges) if (comm.get(e.a) === comm.get(e.b)) inW += 2 * e.w;
  const tot = new Map<number, number>();
  for (const id of ids) tot.set(comm.get(id)!, (tot.get(comm.get(id)!) ?? 0) + (k.get(id) ?? 0));
  let sq = 0;
  for (const t of tot.values()) sq += t * t;
  return inW / m2 - (gamma * sq) / (m2 * m2);
}
