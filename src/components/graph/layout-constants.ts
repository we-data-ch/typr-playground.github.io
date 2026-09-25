// Sizing shared between `useElkLayout` (tells ELK where each port sits) and `BlockNode` (has to
// draw its handles at those exact same offsets, or wires won't line up with the ports they
// connect to).

import type { Block } from '../../lib/graph';

export const NODE_WIDTH = 190;
export const HEADER_HEIGHT = 30;
export const PORT_ROW_HEIGHT = 20;
export const PORT_TOP_PADDING = 8;
export const MIN_NODE_HEIGHT = 46;

export function nodeHeight(block: Block): number {
  const rows = Math.max(block.inputs.length, block.outputs.length, 1);
  return Math.max(MIN_NODE_HEIGHT, HEADER_HEIGHT + rows * PORT_ROW_HEIGHT + PORT_TOP_PADDING);
}

/** Vertical center of the `index`-th port row, relative to the node's top edge. */
export function portOffsetY(index: number): number {
  return HEADER_HEIGHT + PORT_TOP_PADDING + index * PORT_ROW_HEIGHT + PORT_ROW_HEIGHT / 2;
}
