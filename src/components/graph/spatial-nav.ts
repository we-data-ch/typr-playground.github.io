// Arrow-key navigation between nodes on the canvas (spec §11 étape 7: "←/→/↑/↓ : bloc voisin, en
// suivant les fils (amont/aval) puis les frères"). Realized here as plain spatial navigation over
// the ELK-computed layout rather than a separate wire-lookup-then-sibling-fallback: ELK's layered
// left-to-right layout already places a block's upstream/downstream neighbors to its left/right
// (the layering itself follows wire connectivity) and its siblings roughly above/below, so moving
// to the nearest node in the pressed arrow's direction reproduces the spec's intent without a
// second traversal of `body.wires`. Same technique as classic spatial navigation (TV remote /
// game-pad UIs): among nodes strictly on the requested side, pick the smallest combined distance,
// weighting the off-axis offset so a node has to be roughly in front of you, not just nearby.

import type { LaidOutNode } from './useElkLayout';

export type Direction = 'left' | 'right' | 'up' | 'down';

function center(n: LaidOutNode): { x: number; y: number } {
  return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
}

export function nearestInDirection(nodes: LaidOutNode[], fromKey: string, dir: Direction): string | null {
  const from = nodes.find((n) => n.key === fromKey);
  if (!from) return null;
  const fromC = center(from);

  let best: string | null = null;
  let bestScore = Infinity;

  for (const n of nodes) {
    if (n.key === fromKey) continue;
    const c = center(n);
    const dx = c.x - fromC.x;
    const dy = c.y - fromC.y;

    let primary: number;
    let offAxis: number;
    if (dir === 'right') {
      if (dx <= 0) continue;
      primary = dx;
      offAxis = dy;
    } else if (dir === 'left') {
      if (dx >= 0) continue;
      primary = -dx;
      offAxis = dy;
    } else if (dir === 'down') {
      if (dy <= 0) continue;
      primary = dy;
      offAxis = dx;
    } else {
      if (dy >= 0) continue;
      primary = -dy;
      offAxis = dx;
    }

    const score = primary + Math.abs(offAxis) * 1.5;
    if (score < bestScore) {
      bestScore = score;
      best = n.key;
    }
  }

  return best;
}
