// Selected block's details (spec §11: "panneau de détails (type, ports, relations,
// justifications)"). Reads relations from the *full* graph, not the one-level view, since a
// block's most informative relations (a `Ref` to a sibling top-level function, a `Satisfies` to
// an interface) usually cross level boundaries by design (spec §3.3's frontier rule).

import type { Block, BlockGraph, Confidence, Relation } from '../../lib/graph';
import type { BlockDiff } from '../../lib/graph-diff';

interface DetailPanelProps {
  graph: BlockGraph;
  block: Block;
  onGoToBlock: (key: string) => void;
  onClose: () => void;
  /** Set only from the Diff tab, when `block` was reported modified (spec §12 étape 6). */
  diffDetail?: BlockDiff | null;
}

function confidenceLabel(c: Confidence): string {
  if (c.confidence === 'ambiguous') return `ambiguous (${c.candidates.length} candidates)`;
  return c.confidence;
}

export function DetailPanel({ graph, block, onGoToBlock, onClose, diffDetail }: DetailPanelProps) {
  const relations = graph.relations.filter((r) => r.from === block.key || r.to === block.key);
  const outgoing = relations.filter((r) => r.from === block.key);
  const incoming = relations.filter((r) => r.to === block.key && r.from !== block.key);

  return (
    <aside className="detail-panel">
      <div className="detail-panel-header">
        <span className="detail-panel-title">{block.name ?? block.key}</span>
        <button className="btn-icon" onClick={onClose} title="Fermer">
          ×
        </button>
      </div>

      <div className="detail-panel-content">
        <dl className="detail-fields">
          <dt>Key</dt>
          <dd className="mono">{block.key}</dd>
          <dt>Kind</dt>
          <dd>{block.kind}</dd>
          {block.type && (
            <>
              <dt>Type</dt>
              <dd className="mono">{block.type}</dd>
            </>
          )}
          <dt>Origin</dt>
          <dd>{typeof block.origin === 'string' ? block.origin : `R package: ${block.origin.RPackage}`}</dd>
        </dl>

        {diffDetail && (
          <section>
            <h4>Changes</h4>
            <ul className="diff-change-list">
              {diffDetail.type && (
                <li>
                  type: <span className="mono diff-removed-text">{diffDetail.type[0] ?? '_'}</span>
                  {' → '}
                  <span className="mono diff-added-text">{diffDetail.type[1] ?? '_'}</span>
                </li>
              )}
              {diffDetail.captures && (
                <li>
                  captures:{' '}
                  {diffDetail.captures.added.map((p) => (
                    <span key={`+${p.name}`} className="mono diff-added-text">
                      +{p.name}{' '}
                    </span>
                  ))}
                  {diffDetail.captures.removed.map((p) => (
                    <span key={`-${p.name}`} className="mono diff-removed-text">
                      −{p.name}{' '}
                    </span>
                  ))}
                </li>
              )}
              {diffDetail.interface && (
                <li>
                  interface:{' '}
                  {diffDetail.interface.added.map((k) => (
                    <span key={`+${k}`} className="mono diff-added-text">
                      +{k}{' '}
                    </span>
                  ))}
                  {diffDetail.interface.removed.map((k) => (
                    <span key={`-${k}`} className="mono diff-removed-text">
                      −{k}{' '}
                    </span>
                  ))}
                </li>
              )}
            </ul>
          </section>
        )}

        {block.inputs.length > 0 && (
          <section>
            <h4>Inputs</h4>
            <ul className="port-list">
              {block.inputs.map((p) => (
                <li key={p.name}>
                  <span className="mono">{p.name}</span>
                  {p.type && <span className="port-type mono">: {p.type}</span>}
                  {p.implicit && <span className="port-flag">implicit</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {block.outputs.length > 0 && (
          <section>
            <h4>Outputs</h4>
            <ul className="port-list">
              {block.outputs.map((p) => (
                <li key={p.name}>
                  <span className="mono">{p.name}</span>
                  {p.type && <span className="port-type mono">: {p.type}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {outgoing.length > 0 && (
          <section>
            <h4>Relations</h4>
            <ul className="relation-list">
              {outgoing.map((r, i) => (
                <RelationRow key={i} relation={r} otherKey={r.to} arrow="→" onGoToBlock={onGoToBlock} />
              ))}
            </ul>
          </section>
        )}

        {incoming.length > 0 && (
          <section>
            <h4>Referenced by</h4>
            <ul className="relation-list">
              {incoming.map((r, i) => (
                <RelationRow key={i} relation={r} otherKey={r.from} arrow="←" onGoToBlock={onGoToBlock} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}

function RelationRow({
  relation,
  otherKey,
  arrow,
  onGoToBlock,
}: {
  relation: Relation;
  otherKey: string;
  arrow: string;
  onGoToBlock: (key: string) => void;
}) {
  return (
    <li>
      <button className="relation-link" onClick={() => onGoToBlock(otherKey)}>
        <span className="relation-kind">{relation.kind}</span>
        {arrow}
        <span className="mono">{otherKey}</span>
      </button>
      {relation.confidence && <span className="relation-meta">{confidenceLabel(relation.confidence)}</span>}
      {relation.evidence && (
        <ul className="evidence-list">
          {relation.evidence.map((e, i) => (
            <li key={i} className="mono">
              {e.requires} ← {e.provided_by}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
