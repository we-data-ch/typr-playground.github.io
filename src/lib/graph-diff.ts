// The diff data model (`visualization_graph_v2.md` §12 étape 6) and the pure logic the
// playground's Diff view needs on top of it. Field names mirror `crates/typr-graph/src/diff.rs`
// verbatim, same convention as `graph.ts` for the block-graph model itself — this file is a
// translation of the JSON contract, not a reinterpretation.

import type { BlockKind, Port } from './graph';

export interface CaptureChange {
  added: Port[];
  removed: Port[];
}

export interface InterfaceChange {
  added: string[];
  removed: string[];
}

export interface BlockDiff {
  key: string;
  kind?: [BlockKind, BlockKind];
  name?: [string | undefined, string | undefined];
  type?: [string | undefined, string | undefined];
  captures?: CaptureChange;
  interface?: InterfaceChange;
}

export interface GraphDiff {
  added: string[];
  removed: string[];
  modified: BlockDiff[];
}

export type DiffStatus = 'added' | 'removed' | 'modified';

/** The diff status of `key` in `diff` (spec §12: added/removed/modified by `BlockKey`), or `null`
 *  for a block that didn't change — the common case, so callers can skip styling entirely. */
export function statusFor(diff: GraphDiff, key: string): DiffStatus | null {
  if (diff.added.includes(key)) return 'added';
  if (diff.removed.includes(key)) return 'removed';
  if (diff.modified.some((m) => m.key === key)) return 'modified';
  return null;
}

/** The `BlockDiff` for a modified block, or `null` if `key` wasn't reported modified (added,
 *  removed, or unchanged all read as `null` here — callers already have `statusFor` for those). */
export function modifiedDetail(diff: GraphDiff, key: string): BlockDiff | null {
  return diff.modified.find((m) => m.key === key) ?? null;
}

export interface DiffCounts {
  added: number;
  removed: number;
  modified: number;
}

export function diffCounts(diff: GraphDiff): DiffCounts {
  return { added: diff.added.length, removed: diff.removed.length, modified: diff.modified.length };
}

export function isDiffEmpty(diff: GraphDiff): boolean {
  return diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0;
}
