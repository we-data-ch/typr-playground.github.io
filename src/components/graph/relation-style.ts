// Presentation for the three relation categories the Graph tab can draw as edges (spec §11
// "Relations comme arêtes"). Kept separate from `lib/graph.ts`, which stays free of anything
// React/CSS-specific.

import type { RelationEdgeCategory } from '../../lib/graph';

export const RELATION_CATEGORIES: RelationEdgeCategory[] = ['capture', 'typePosition0', 'hasType'];

export const RELATION_LABEL: Record<RelationEdgeCategory, string> = {
  capture: 'Capture implicite',
  typePosition0: '1ᵉʳ paramètre : type',
  hasType: 'Expression : type',
};

/** Themed (light/dark, see `theme.css`) — used for the edge's own stroke and the legend swatch. */
export const RELATION_COLOR: Record<RelationEdgeCategory, string> = {
  capture: 'var(--edge-capture)',
  typePosition0: 'var(--edge-type-position)',
  hasType: 'var(--edge-has-type)',
};

/**
 * Fixed (not themed) hex used only for the arrowhead fill: React Flow sets a marker's `color` as a
 * plain SVG attribute rather than through `style`, so a CSS custom property there is unreliable.
 * A mid-brightness hue reads acceptably on both light and dark canvas backgrounds, so the small
 * arrowhead doesn't need per-theme variation the way the edge line (`RELATION_COLOR`) does.
 */
export const RELATION_MARKER_COLOR: Record<RelationEdgeCategory, string> = {
  capture: '#8b5cf6',
  typePosition0: '#0ea5e9',
  hasType: '#d946ef',
};
