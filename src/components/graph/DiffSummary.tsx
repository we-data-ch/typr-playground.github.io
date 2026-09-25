// Summary bar for the Diff tab (spec §12 étape 6): counts, plus the list of removed blocks —
// shown here rather than as nodes because a removed key has no place in the *new* graph's layout
// (`GraphView` renders `newGraph`; a block that no longer exists can't be positioned in it).

import type { BlockGraph } from '../../lib/graph';
import { diffCounts, isDiffEmpty, type GraphDiff } from '../../lib/graph-diff';

interface DiffSummaryProps {
  diff: GraphDiff;
  oldGraph: BlockGraph;
  onResetBaseline: () => void;
}

export function DiffSummary({ diff, oldGraph, onResetBaseline }: DiffSummaryProps) {
  const counts = diffCounts(diff);

  return (
    <div className="diff-summary">
      <div className="diff-summary-counts">
        {isDiffEmpty(diff) ? (
          <span className="diff-summary-empty">Aucun changement depuis la référence</span>
        ) : (
          <>
            {counts.added > 0 && <span className="diff-count diff-added-text">+{counts.added} ajoutés</span>}
            {counts.modified > 0 && <span className="diff-count diff-modified-text">~{counts.modified} modifiés</span>}
            {counts.removed > 0 && <span className="diff-count diff-removed-text">−{counts.removed} supprimés</span>}
          </>
        )}
      </div>
      <button className="btn btn-secondary diff-reset-baseline" onClick={onResetBaseline}>
        Marquer le code actuel comme référence
      </button>

      {diff.removed.length > 0 && (
        <ul className="diff-removed-list">
          {diff.removed.map((key) => {
            const block = oldGraph.blocks[key];
            return (
              <li key={key} className="mono">
                <span className="diff-removed-text">−</span> {block?.kind ?? '?'} {block?.name ?? key}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
