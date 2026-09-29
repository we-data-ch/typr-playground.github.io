// Toggle legend for "Relations comme arêtes" (spec §11): one checkbox per relation category, so
// each can be shown or hidden independently and the graph re-laid-out around whichever are active.
//
// The panel is collapsible: it floats over the canvas, and on a phone-sized canvas the open list
// hides a large part of the graph, so it starts closed below 768px (same breakpoint as the rest
// of the responsive rules in App.css) and reopens on a tap of the header.

import { useState } from 'react';
import type { RelationEdgeCategory } from '../../lib/graph';
import { RELATION_CATEGORIES, RELATION_COLOR, RELATION_LABEL } from './relation-style';

const NARROW_SCREEN = '(max-width: 768px)';

interface RelationLegendProps {
  active: ReadonlySet<RelationEdgeCategory>;
  onToggle: (category: RelationEdgeCategory) => void;
}

export function RelationLegend({ active, onToggle }: RelationLegendProps) {
  const [open, setOpen] = useState(() => !window.matchMedia(NARROW_SCREEN).matches);

  return (
    <div className="relation-legend">
      <button
        className="relation-legend-toggle"
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Masquer la légende' : 'Afficher la légende'}
        aria-expanded={open}
      >
        <span className={`disclosure-chevron ${open ? 'open' : ''}`}>▸</span>
        Légende
      </button>

      {open && (
        <div className="relation-legend-rows">
          {RELATION_CATEGORIES.map((category) => (
            <label key={category} className="relation-legend-row">
              <input type="checkbox" checked={active.has(category)} onChange={() => onToggle(category)} />
              <span className="relation-legend-swatch" style={{ background: RELATION_COLOR[category] }} />
              {RELATION_LABEL[category]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
