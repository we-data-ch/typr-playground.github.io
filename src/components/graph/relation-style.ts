// Presentation for the relation categories the Graph tab can draw as edges (spec §11
// "Relations comme arêtes"). Kept separate from `lib/graph.ts`, which stays free of anything
// React/CSS-specific.

import type { RelationEdgeCategory } from '../../lib/graph';

export const RELATION_CATEGORIES: RelationEdgeCategory[] = [
  'ref',
  'capture',
  'typePosition0',
  'hasType',
  'satisfies',
  'declaredAs',
  'subtype',
  'instantiates',
];

export const RELATION_LABEL: Record<RelationEdgeCategory, string> = {
  ref: 'Reference to a definition',
  capture: 'Implicit capture',
  typePosition0: '1st parameter: type',
  hasType: 'Expression: type',
  satisfies: 'Satisfies an interface',
  declaredAs: 'Declared as',
  subtype: 'Subtype of',
  instantiates: 'Instantiates a generic',
};

/** Themed (light/dark, see `theme.css`) — used for the edge's own stroke and the legend swatch. */
export const RELATION_COLOR: Record<RelationEdgeCategory, string> = {
  ref: 'var(--edge-ref)',
  capture: 'var(--edge-capture)',
  typePosition0: 'var(--edge-type-position)',
  hasType: 'var(--edge-has-type)',
  satisfies: 'var(--edge-satisfies)',
  declaredAs: 'var(--edge-declared-as)',
  subtype: 'var(--edge-subtype)',
  instantiates: 'var(--edge-instantiates)',
};

/**
 * Fixed (not themed) hex used only for the arrowhead fill: React Flow sets a marker's `color` as a
 * plain SVG attribute rather than through `style`, so a CSS custom property there is unreliable.
 * A mid-brightness hue reads acceptably on both light and dark canvas backgrounds, so the small
 * arrowhead doesn't need per-theme variation the way the edge line (`RELATION_COLOR`) does.
 */
export const RELATION_MARKER_COLOR: Record<RelationEdgeCategory, string> = {
  ref: '#3b82f6',
  capture: '#8b5cf6',
  typePosition0: '#0ea5e9',
  hasType: '#d946ef',
  satisfies: '#10b981',
  declaredAs: '#f59e0b',
  subtype: '#ef4444',
  instantiates: '#14b8a6',
};
