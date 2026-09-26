import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { Block } from '../../lib/graph';
import type { DiffStatus } from '../../lib/graph-diff';
import { NODE_WIDTH, nodeHeight, portOffsetY } from './layout-constants';

export interface BlockNodeData {
  block: Block;
  /** Set only in the Diff view (spec §12 étape 6); `undefined` elsewhere, and for an unchanged
   *  block there too — most nodes, so that stays the common case rather than a three-way enum.
   *  Only ever `'added'`/`'modified'` in practice: a `'removed'` key has no node to attach to
   *  (it doesn't exist in the graph being rendered), so it's reported separately (`DiffSummary`). */
  diffStatus?: DiffStatus;
  [key: string]: unknown;
}

const diffBadge: Record<DiffStatus, string> = { added: '+', removed: '−', modified: '~' };

export type BlockNodeType = Node<BlockNodeData, 'block'>;

// Rough grouping so the graph reads at a glance (pedagogy: a declaration, an interface, a value
// and a control-flow node don't look alike) — not a strict taxonomy, just a handful of CSS hooks.
function kindGroup(kind: Block['kind']): string {
  switch (kind) {
    case 'TypeDecl':
    case 'TypeExpr':
    case 'Interface':
      return 'type';
    case 'Function':
      return 'function';
    case 'If':
    case 'Loop':
    case 'Match':
      return 'control';
    case 'Program':
    case 'Module':
      return 'module';
    default:
      return 'value';
  }
}

export function BlockNode({ data, selected }: NodeProps<BlockNodeType>) {
  const { block, diffStatus } = data;
  const title = block.name ?? block.key.split('/').pop() ?? block.key;
  const diffClass = diffStatus ? ` diff-${diffStatus}` : '';

  return (
    <div
      className={`block-node kind-${kindGroup(block.kind)}${diffClass}${selected ? ' selected' : ''}`}
      style={{ width: NODE_WIDTH, height: nodeHeight(block) }}
      title="Clic : sélectionner · Double-clic : entrer · Alt+clic : aller à la définition"
    >
      <div className="block-node-header">
        {diffStatus && <span className={`block-node-diff-badge diff-${diffStatus}`}>{diffBadge[diffStatus]}</span>}
        <span className="block-node-kind">{block.kind}</span>
        <span className="block-node-name">{title}</span>
      </div>
      {block.type && <div className="block-node-type">{block.type}</div>}

      {/*
        Two Handles per port, stacked at the same spot: a declared input is usually a wire
        *target* (a sibling feeds it), but when this block is the view's own focus, that same
        input is the *source* feeding its body (e.g. sq's parameter `n` in `n * n`) — and
        symmetrically for a declared output. Rather than guess which role applies from here,
        both are always present; only the one an actual wire resolves to is ever connected. The
        second Handle of each pair is visually suppressed (`handle-shadow`) so a port still shows
        one dot.
      */}
      {block.inputs.map((port, i) => (
        <Handle
          key={`in-${port.name}`}
          type="target"
          position={Position.Left}
          id={port.name}
          style={{ top: portOffsetY(i) }}
          className={port.implicit ? 'handle-implicit' : undefined}
        >
          <span className="block-node-port-label port-label-in">{port.name}</span>
        </Handle>
      ))}
      {block.inputs.map((port, i) => (
        <Handle
          key={`in-src-${port.name}`}
          type="source"
          position={Position.Left}
          id={port.name}
          className="handle-shadow"
          style={{ top: portOffsetY(i) }}
        />
      ))}
      {block.outputs.map((port, i) => (
        <Handle
          key={`out-${port.name}`}
          type="source"
          position={Position.Right}
          id={port.name}
          style={{ top: portOffsetY(i) }}
        >
          <span className="block-node-port-label port-label-out">{port.name}</span>
        </Handle>
      ))}
      {block.outputs.map((port, i) => (
        <Handle
          key={`out-tgt-${port.name}`}
          type="target"
          position={Position.Right}
          id={port.name}
          className="handle-shadow"
          style={{ top: portOffsetY(i) }}
        />
      ))}

      {/*
        Anchor points for relation edges (spec §11 "Relations comme arêtes" — capture `Ref`,
        `HasType`, `TypePosition{0}`). Relations aren't ports of the model (§3.2), so they can't
        reuse a data-port Handle above, which may not even exist on the relevant side (e.g. a
        `TypeDecl` has no inputs at all). One dedicated pair at the top of the node instead,
        invisible like the shadow handles: the edge's own color and arrowhead carry the meaning.
      */}
      <Handle type="target" position={Position.Top} id="__rel-in" className="handle-relation" />
      <Handle type="source" position={Position.Top} id="__rel-out" className="handle-relation" />
    </div>
  );
}
