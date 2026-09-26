// Toggle legend for "Relations comme arêtes" (spec §11): one checkbox per relation category, so
// each can be shown or hidden independently and the graph re-laid-out around whichever are active.

import type { RelationEdgeCategory } from '../../lib/graph';
import { RELATION_CATEGORIES, RELATION_COLOR, RELATION_LABEL } from './relation-style';

interface RelationLegendProps {
  active: ReadonlySet<RelationEdgeCategory>;
  onToggle: (category: RelationEdgeCategory) => void;
}

export function RelationLegend({ active, onToggle }: RelationLegendProps) {
  return (
    <div className="relation-legend">
      {RELATION_CATEGORIES.map((category) => (
        <label key={category} className="relation-legend-row">
          <input type="checkbox" checked={active.has(category)} onChange={() => onToggle(category)} />
          <span className="relation-legend-swatch" style={{ background: RELATION_COLOR[category] }} />
          {RELATION_LABEL[category]}
        </label>
      ))}
    </div>
  );
}
