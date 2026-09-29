// Root of the Graph tab (spec §11): one level of the block-graph, rendered with React Flow +
// ELK.js, plus a breadcrumb and a detail panel for the selected block. Gestures: clic (select),
// double-clic (enter a block with a body), Alt+clic (go to definition). Keyboard nav (spec §12
// étape 7) lives here too, as a `document`-level listener scoped to this component's lifetime —
// it's only ever mounted while the Graph/Diff tab is on screen (see `App.tsx`), and it stands
// down for any keystroke aimed at an input/textarea/Monaco (`isTypingTarget`).
//
// The canvas itself needs `tabIndex` to make this reachable at all: a plain, non-focusable `div`
// (what every node/pane here would otherwise be) never steals focus away from Monaco on click —
// that's standard browser behaviour, confirmed by manual CDP testing while building this — so
// without an explicit focus target the editor would keep eating every keystroke even after the
// user has clicked into the graph. Autofocusing on mount covers arriving at the tab; the
// mousedown handler covers focus having drifted back to Monaco since.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, Background, Controls, MarkerType, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { oneLevel, parentKey, resolveDefinition, type BlockGraph, type RelationEdgeCategory } from '../../lib/graph';
import { modifiedDetail, statusFor, type GraphDiff } from '../../lib/graph-diff';
import { isTypingTarget } from '../../lib/dom';
import { useElkLayout } from './useElkLayout';
import { nearestInDirection, type Direction } from './spatial-nav';
import { BlockNode, type BlockNodeType } from './BlockNode';
import { DetailPanel } from './DetailPanel';
import { BlockSearch } from './BlockSearch';
import { RelationLegend } from './RelationLegend';
import { RELATION_COLOR, RELATION_MARKER_COLOR } from './relation-style';

const ARROW_DIRECTIONS: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

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
  // Relation-edge visibility (spec §11 "Relations comme arêtes"): a session-local preference, not
  // part of the shared `view`/`focus` URL state — same reasoning as the Diff tab's baseline.
  // All off by default so the canvas's default look doesn't change.
  const [activeRelationKinds, setActiveRelationKinds] = useState<Set<RelationEdgeCategory>>(() => new Set());
  const { layout } = useElkLayout(view, activeRelationKinds);

  function toggleRelationKind(category: RelationEdgeCategory) {
    setActiveRelationKinds((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  const breadcrumb = useMemo(() => breadcrumbFor(focus, graph.root), [focus, graph.root]);

  const canvasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    canvasRef.current?.focus();
  }, []);

  const [searchOpen, setSearchOpen] = useState(false);
  // "Dépliage sur place" (spec §12 étape 7): a selected block's Contenu section in the detail
  // panel, toggled by Space or its own disclosure button. Reset whenever the selection changes so
  // it doesn't stay pinned open on an unrelated block — the React-docs "adjust state during
  // render" pattern, rather than a setState-in-effect that would trigger an extra render pass.
  const [contentExpanded, setContentExpanded] = useState(false);
  const [lastSelectedKey, setLastSelectedKey] = useState(selectedKey);
  if (selectedKey !== lastSelectedKey) {
    setLastSelectedKey(selectedKey);
    setContentExpanded(false);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(document.activeElement) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (e.key === 'Escape' || e.key === 'Backspace') {
        // `parentKey` only understands `/`-nesting; a top-level declaration (`val:sq`) is still a
        // child of the Program root in the one-level view, just without a `/` prefix to say so —
        // same fallback `breadcrumbFor` above uses to make sure its chain always starts at root.
        const parent = focus === graph.root ? null : (parentKey(focus) ?? graph.root);
        if (parent) {
          e.preventDefault();
          onEnter(parent);
          onSelectKey(focus);
        }
        return;
      }

      if (!selectedKey) {
        // First press with nothing selected: land on the focus block itself rather than no-op.
        if (e.key in ARROW_DIRECTIONS) {
          e.preventDefault();
          onSelectKey(focus);
        }
        return;
      }

      const block = view?.blocks[selectedKey];

      if (e.key === 'Enter') {
        if (block?.body) {
          e.preventDefault();
          onEnter(selectedKey);
        }
      } else if (e.key === ' ') {
        if (block?.body && block.body.children.length > 0) {
          e.preventDefault();
          setContentExpanded((v) => !v);
        }
      } else if (e.key === 'g' || e.key === 'G') {
        const target = resolveDefinition(graph, selectedKey);
        if (target) {
          e.preventDefault();
          onEnter(target);
        }
      } else if (e.key in ARROW_DIRECTIONS && layout) {
        const next = nearestInDirection(layout.nodes, selectedKey, ARROW_DIRECTIONS[e.key]);
        if (next) {
          e.preventDefault();
          onSelectKey(next);
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [focus, selectedKey, view, layout, graph, onEnter, onSelectKey]);

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
    return layout.edges.map((e) => {
      if (e.category) {
        return {
          id: e.id,
          source: e.sourceKey,
          sourceHandle: '__rel-out',
          target: e.targetKey,
          targetHandle: '__rel-in',
          type: 'smoothstep',
          style: {
            stroke: RELATION_COLOR[e.category],
            strokeWidth: 1.5,
            strokeDasharray: e.category === 'capture' ? '4 3' : e.category === 'subtype' ? '2 3' : undefined,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: RELATION_MARKER_COLOR[e.category], width: 14, height: 14 },
        };
      }
      return {
        id: e.id,
        source: e.sourceKey,
        sourceHandle: e.sourcePort ?? undefined,
        target: e.targetKey,
        targetHandle: e.targetPort ?? undefined,
        type: 'smoothstep',
      };
    });
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
        <div
          className="graph-canvas"
          ref={canvasRef}
          tabIndex={0}
          onMouseDown={() => canvasRef.current?.focus()}
        >
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

          <RelationLegend active={activeRelationKinds} onToggle={toggleRelationKind} />

          {searchOpen && (
            <BlockSearch
              graph={graph}
              onClose={() => setSearchOpen(false)}
              onSelect={(key) => {
                setSearchOpen(false);
                const parent = parentKey(key) ?? graph.root;
                onEnter(parent);
                onSelectKey(key);
              }}
            />
          )}
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
            contentExpanded={contentExpanded}
            onToggleContent={() => setContentExpanded((v) => !v)}
          />
        )}
      </div>
    </div>
  );
}
