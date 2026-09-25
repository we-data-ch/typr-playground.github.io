import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { Block } from '../../lib/graph';
import { NODE_WIDTH, nodeHeight, portOffsetY } from './layout-constants';

export interface BlockNodeData {
  block: Block;
  [key: string]: unknown;
}

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
  const { block } = data;
  const title = block.name ?? block.key.split('/').pop() ?? block.key;

  return (
    <div
      className={`block-node kind-${kindGroup(block.kind)}${selected ? ' selected' : ''}`}
      style={{ width: NODE_WIDTH, height: nodeHeight(block) }}
      title="Clic : sélectionner · Double-clic : entrer · Alt+clic : aller à la définition"
    >
      <div className="block-node-header">
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
    </div>
  );
}
