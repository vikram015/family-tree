import type { FNode } from "../../model/FNode";

export interface GenerationRow {
  /** 1-based generation number (earliest = 1). */
  generation: number;
  /** Human label for the era, e.g. "1885 – 1915" or "est. 1945 – 1975". */
  yearRange: string;
  /** People in this generation, ordered so spouse pairs are adjacent. */
  people: FNode[];
  /** Deduped spouse-id pairs within this generation (for marriage links). */
  pairs: Array<[string, string]>;
}

const GEN_SPAN = 30; // approx. years per generation, used only for estimates

function dobYear(node: FNode): number | null {
  const raw = (node?.dob || "").toString().trim();
  if (!raw) return null;
  const match = raw.match(/(\d{4})/);
  if (!match) return null;
  const y = Number(match[1]);
  return Number.isFinite(y) ? y : null;
}

function isAlive(node: FNode): boolean {
  return node?.isAlive !== false && !node?.deceasedDate;
}

/**
 * Groups people into generations for the timeline view.
 * Generation depth is the longest parent→child chain; spouses are aligned to
 * the same generation as their partner (so married-in spouses without in-tree
 * ancestry sit beside them). Earliest generation is 1.
 */
export function buildGenerations(
  nodes: FNode[],
  currentTreeId?: string,
): GenerationRow[] {
  if (!nodes || nodes.length === 0) return [];

  // Scope to the current tree so a married-in spouse's OWN relatives from
  // another tree (e.g. their children from a different marriage) don't get laid
  // out on this tree's generation frame — which would misplace them. We keep
  // the current tree's members plus their direct (possibly cross-tree) spouses,
  // and drop everyone else.
  let scoped = nodes;
  if (currentTreeId) {
    const inTree = (n: FNode) => !n.treeId || n.treeId === currentTreeId;
    const inTreeIds = new Set(nodes.filter(inTree).map((n) => n.id));
    const spouseOfInTree = new Set<string>();
    nodes.forEach((n) => {
      if (inTreeIds.has(n.id)) {
        ((n.spouses || []) as any[]).forEach((s) => spouseOfInTree.add(s.id));
      }
    });
    scoped = nodes.filter(
      (n) => inTreeIds.has(n.id) || spouseOfInTree.has(n.id),
    );
  }
  nodes = scoped;

  const byId = new Map<string, FNode>();
  nodes.forEach((n) => byId.set(n.id, n));

  // 1. Depth via memoized longest-path over parent→child edges (cycle-guarded).
  const gen = new Map<string, number>();
  const visiting = new Set<string>();
  const computeGen = (id: string): number => {
    const cached = gen.get(id);
    if (cached != null) return cached;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const node = byId.get(id);
    const parentIds = (node?.parents || [])
      .map((p: any) => p.id)
      .filter((pid: string) => byId.has(pid));
    let g = 0;
    for (const pid of parentIds) g = Math.max(g, computeGen(pid) + 1);
    visiting.delete(id);
    gen.set(id, g);
    return g;
  };
  nodes.forEach((n) => computeGen(n.id));

  // 2. Align spouse pairs to the same generation (bounded passes).
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    for (const n of nodes) {
      for (const s of (n.spouses || []) as any[]) {
        if (!byId.has(s.id)) continue;
        const a = gen.get(n.id) ?? 0;
        const b = gen.get(s.id) ?? 0;
        const m = Math.max(a, b);
        if (a !== m) {
          gen.set(n.id, m);
          changed = true;
        }
        if (b !== m) {
          gen.set(s.id, m);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  // 3. Group by generation.
  const groups = new Map<number, FNode[]>();
  nodes.forEach((n) => {
    const g = gen.get(n.id) ?? 0;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(n);
  });
  const sortedGens = Array.from(groups.keys()).sort((a, b) => a - b);
  const minGen = sortedGens[0] ?? 0;
  const maxGen = sortedGens[sortedGens.length - 1] ?? 0;

  // Known DOB year span per generation (for labelling + estimation).
  const yearByGen = new Map<number, { min: number; max: number }>();
  sortedGens.forEach((g) => {
    const years = groups
      .get(g)!
      .map(dobYear)
      .filter((y): y is number => y != null);
    if (years.length) {
      yearByGen.set(g, { min: Math.min(...years), max: Math.max(...years) });
    }
  });

  const computeYearRange = (g: number): string => {
    const groupPeople = groups.get(g)!;
    const isLast = g === maxGen;
    const hasAlive = groupPeople.some(isAlive);
    const known = yearByGen.get(g);
    if (known) {
      const end = isLast && hasAlive ? "present" : String(known.max);
      return `${known.min} – ${end}`;
    }
    // Estimate from the nearest generation with a known DOB.
    let nearest: { gg: number; min: number } | null = null;
    let nearestDist = Infinity;
    for (const [gg, yr] of yearByGen) {
      const d = Math.abs(gg - g);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = { gg, min: yr.min };
      }
    }
    if (!nearest) return "";
    const start = Math.round((nearest.min + (g - nearest.gg) * GEN_SPAN) / 5) * 5;
    const end = isLast && hasAlive ? "present" : String(start + GEN_SPAN);
    return `est. ${start} – ${end}`;
  };

  // Order each generation so spouse pairs are adjacent; collect the pairs.
  const orderBySpouse = (
    people: FNode[],
  ): { ordered: FNode[]; pairs: Array<[string, string]> } => {
    const inGen = new Set(people.map((p) => p.id));
    const placed = new Set<string>();
    const ordered: FNode[] = [];
    const pairs: Array<[string, string]> = [];
    const seen = new Set<string>();
    for (const p of people) {
      if (placed.has(p.id)) continue;
      ordered.push(p);
      placed.add(p.id);
      const spouseIds = ((p.spouses || []) as any[])
        .map((s) => s.id)
        .filter((id: string) => inGen.has(id));
      for (const sid of spouseIds) {
        const key = [p.id, sid].sort().join("|");
        if (!seen.has(key)) {
          seen.add(key);
          pairs.push([p.id, sid]);
        }
        if (!placed.has(sid)) {
          const sp = byId.get(sid);
          if (sp) {
            ordered.push(sp);
            placed.add(sid);
          }
        }
      }
    }
    return { ordered, pairs };
  };

  return sortedGens.map((g) => {
    const { ordered, pairs } = orderBySpouse(groups.get(g)!);
    return {
      generation: g - minGen + 1,
      yearRange: computeYearRange(g),
      people: ordered,
      pairs,
    };
  });
}
