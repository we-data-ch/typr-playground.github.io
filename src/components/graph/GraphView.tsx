// Root of the Graph tab (spec §11): one level of the block-graph, rendered with React Flow +
// ELK.js, plus a breadcrumb and a detail panel for the selected block. Gestures: clic (select),
// double-clic (enter a block with a body), Alt+clic (go to definition). Keyboard nav is out of
// scope here — spec §12 étape 4 explicitly defers it to étape 7.

import { useMemo } from 'react';
import { ReactFlow, Background, Controls, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { oneLevel, parentKey, resolveDefinition, type BlockGraph } from '../../lib/graph';
import { modifiedDetail, statusFor, type GraphDiff } from '../../lib/graph-diff';
import { useElkLayout } from './useElkLayout';
import { BlockNode, type BlockNodeType } from './BlockNode';
import { DetailPanel } from './DetailPanel';

const nodeTypes = { block: BlockNode };

interface GraphViewProps {
  graph: BlockGraph;
  focus: string;
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
  onEnter: (key: string) => void;
  /** Set only from the Diff tab (spec §12 étape 6): colors each node by its diff status against
   *  a baseline, on top of the same one-level rendering used everywhere else. */
  diff?: GraphDiff | null;
}

function breadcrumbFor(focus: string, root: string): string[] {
  const chain: string[] = [];
  let cur: string | null = focus;
  while (cur) {
    chain.unshift(cur);
    cur = parentKey(cur);
  }
  if (chain[0] !== root) chain.unshift(root);
  return chain;
}

export function GraphView({ graph, focus, selectedKey, onSelectKey, onEnter, diff }: GraphViewProps) {
  const view = useMemo(() => oneLevel(graph, focus), [graph, focus]);
  const { layout } = useElkLayout(view);

  const breadcrumb = useMemo(() => breadcrumbFor(focus, graph.root), [focus, graph.root]);

  const nodes: BlockNodeType[] = useMemo(() => {
    if (!view || !layout) return [];
    return layout.nodes.flatMap((n) => {
      const block = view.blocks[n.key];
      if (!block) return [];
      return [
        {
          id: n.key,
          type: 'block' as const,
          position: { x: n.x, y: n.y },
          data: { block, diffStatus: diff ? (statusFor(diff, n.key) ?? undefined) : undefined },
          selected: n.key === selectedKey,
          draggable: false,
        },
      ];
    });
  }, [view, layout, selectedKey, diff]);

  const edges: Edge[] = useMemo(() => {
    if (!layout) return [];
    return layout.edges.map((e) => ({
      id: e.id,
      source: e.sourceKey,
      sourceHandle: e.sourcePort,
      target: e.targetKey,
      targetHandle: e.targetPort,
      type: 'smoothstep',
    }));
  }, [layout]);

  const selectedBlock = selectedKey ? graph.blocks[selectedKey] : null;

  if (!view) {
    return <div className="graph-empty">Bloc introuvable : {focus}</div>;
  }

  return (
    <div className="graph-view">
      <div className="graph-breadcrumb">
        {breadcrumb.map((key, i) => {
          const isLast = i === breadcrumb.length - 1;
          const label = key === graph.root ? 'Programme' : graph.blocks[key]?.name ?? key.split('/').pop() ?? key;
          return (
            <span key={key} className="breadcrumb-segment">
              {i > 0 && <span className="breadcrumb-sep">›</span>}
              {isLast ? (
                <span className="breadcrumb-current">{label}</span>
              ) : (
                <button className="breadcrumb-link" onClick={() => onEnter(key)}>
                  {label}
                </button>
              )}
            </span>
          );
        })}
      </div>

      <div className="graph-canvas-row">
        <div className="graph-canvas">
          <ReactFlow
            key={focus}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            // React Flow's default "double-click pane to zoom" would otherwise swallow a
            // double-click on a node before it reaches onNodeDoubleClick below: nodes only carry
            // the `nopan` class (which protects them from that built-in handler) when
            // nodesDraggable is true, which it isn't here — ELK, not the user, controls layout.
            zoomOnDoubleClick={false}
            fitView
            onNodeClick={(event, node) => {
              if (event.altKey) {
                const target = resolveDefinition(graph, node.id);
                if (target) onEnter(target);
                return;
              }
              onSelectKey(node.id);
            }}
            onNodeDoubleClick={(_event, node) => {
              const block = view.blocks[node.id];
              if (block?.body) onEnter(node.id);
            }}
            onPaneClick={() => onSelectKey(null)}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        {selectedBlock && (
          <DetailPanel
            graph={graph}
            block={selectedBlock}
            diffDetail={diff ? modifiedDetail(diff, selectedBlock.key) : undefined}
            onGoToBlock={(key) => {
              const parent = parentKey(key) ?? graph.root;
              onEnter(parent);
              onSelectKey(key);
            }}
            onClose={() => onSelectKey(null)}
          />
        )}
      </div>
    </div>
  );
}
