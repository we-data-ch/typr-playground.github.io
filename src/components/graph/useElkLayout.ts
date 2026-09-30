// Lays out a one-level `BlockGraph` view with ELK.js (spec §11: "ELK.js pour la mise en page
// (elk.portConstraints), un niveau rendu à la fois"). All blocks of the view — the focus block
// included — are laid out as sibling boxes with ports on their left/right edges, a layered
// left-to-right flow graph; this mirrors `typr-graph`'s own DOT exporter
// (`crates/typr-graph/src/export/dot.rs`) rather than nesting focus as a container frame, so the
// two renderers (CLI DOT, playground) agree on what "one level" looks like.

import { useEffect, useState } from 'react';
// The bundled build runs layout synchronously in the main thread — no Worker, which Vite's
// dev/build pipeline would otherwise need special handling for.
import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js';
import { liftToView, relationCategory, relationEdgesInView, type Block, type BlockGraph, type RelationEdgeCategory } from '../../lib/graph';
import { NODE_WIDTH, nodeHeight, portOffsetY } from './layout-constants';

const elk = new ELK();

export interface LaidOutNode {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** A block defined outside the view's frontier, shown only as the target of a relation edge. */
  external?: boolean;
}

export interface LaidOutEdge {
  id: string;
  sourceKey: string;
  /** `null` for a relation edge (spec §11): it connects to the block itself, not a data port. */
  sourcePort: string | null;
  targetKey: string;
  targetPort: string | null;
  /** Set only for a relation edge; absent for a wire. */
  category?: RelationEdgeCategory;
}

export interface GraphLayout {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  width: number;
  height: number;
}

function portId(blockKey: string, portName: string, kind: 'in' | 'out'): string {
  return `${blockKey}::${kind}::${portName}`;
}

/**
 * Which side a `{block, port}` pair was declared on — *not* assumable from a wire's `from`/`to`
 * position. A wire's source is usually a child's output feeding a sibling, but a compound
 * block's own *input* can just as well be the source of a wire inside its own body (e.g. `sq`'s
 * parameter `n` feeding `n * n`): the block exposes it as a port either way, ELK just needs to
 * know which side it was registered on. `null` if `portName` isn't one of the block's ports.
 */
function portSide(block: Block | undefined, portName: string): 'in' | 'out' | null {
  if (!block) return null;
  if (block.inputs.some((p) => p.name === portName)) return 'in';
  if (block.outputs.some((p) => p.name === portName)) return 'out';
  return null;
}

/** A block of the full graph reduced to a stub for use as an external node: its outputs stay
 *  (a wire from outside the frontier attaches to one), its inputs and body go. */
export function externalStub(block: Block): Block {
  return { ...block, inputs: [], body: undefined };
}

/** The relation categories mentioning each block, in one pass over the graph — a node is worth
 *  the canvas space only if at least one *active* category points at it. */
function categoriesByBlockKey(graph: BlockGraph): Map<string, Set<RelationEdgeCategory>> {
  const byKey = new Map<string, Set<RelationEdgeCategory>>();
  for (const r of graph.relations) {
    const category = relationCategory(graph, r);
    if (!category) continue;
    for (const key of [r.from, r.to]) {
      let set = byKey.get(key);
      if (!set) byKey.set(key, (set = new Set()));
      set.add(category);
    }
  }
  return byKey;
}

/** A `TypeExpr` block only exists in a view because something's type points at it: the compiler
 *  hangs `type:int`/`type:bool`/… off the `Program`, and a record's field types off its
 *  `TypeDecl`. With no active category pointing at it, it is a node with no edge — pure noise on
 *  top of the expressions, and on a phone-sized canvas more noise than the graph can spare, so it's
 *  dropped. The type itself is not lost: every node still prints its own `type` (BlockNode).
 *
 *  Inside a type block those children *are* the content (`type:Person` is nothing but its two
 *  field types), so they're kept whatever the toggles say — otherwise entering a record would
 *  leave a lone node on the canvas. */
function isHiddenTypeMention(
  block: Block,
  view: BlockGraph,
  graph: BlockGraph,
  categoriesByKey: Map<string, Set<RelationEdgeCategory>>,
  active: ReadonlySet<RelationEdgeCategory>,
): boolean {
  if (block.kind !== 'TypeExpr') return false;
  if (block.key === view.root) return false;
  if (graph.blocks[view.root]?.kind && TYPE_KINDS.has(graph.blocks[view.root].kind)) return false;
  const categories = categoriesByKey.get(block.key);
  return !categories || ![...categories].some((c) => active.has(c));
}

const TYPE_KINDS: ReadonlySet<Block['kind']> = new Set(['TypeDecl', 'Interface', 'TypeExpr']);

export function useElkLayout(
  graph: BlockGraph,
  view: BlockGraph | null,
  activeRelationKinds: ReadonlySet<RelationEdgeCategory> = new Set(),
): { layout: GraphLayout | null; loading: boolean } {
  const [layout, setLayout] = useState<GraphLayout | null>(null);
  const [loading, setLoading] = useState(false);

  // A one-level view's *shape* (which blocks it contains) is all the layout depends on; the
  // block contents at a given key are stable, so this key is enough to decide whether to
  // recompute — plus which relation categories are active (spec §11), since toggling one changes
  // which edges ELK sees and must re-arrange the nodes around.
  const categoriesKey = [...activeRelationKinds].sort().join(',');
  const viewKey = view ? `${view.root}:${Object.keys(view.blocks).sort().join(',')}:${categoriesKey}:${graph.relations.length}` : null;

  useEffect(() => {
    if (!view) {
      setLayout(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // Relation edges first: their targets outside the frontier become extra (external) nodes.
    const { edges: relationEdges, externals } = relationEdgesInView(graph, view, activeRelationKinds);

    // A wire kept in a view block's body can start outside the frontier — `nombre + 7` entered
    // on the `+`: `nombre.out → lhs`, with `nombre` a sibling of the focus, not part of its view.
    // Its source becomes an external node too (same rule as a relation target) rather than
    // dropping the input's only visible origin.
    const inView = new Set(Object.keys(view.blocks));
    const wireEndsOutside = (end: { block: string; port: string }) =>
      !inView.has(end.block) && liftToView(view, end.block) === null && !!graph.blocks[end.block];
    const outsideWireBlocks = new Set<string>();
    for (const b of Object.values(view.blocks)) {
      for (const w of b.body?.wires ?? []) {
        if (wireEndsOutside(w.from) && portSide(graph.blocks[w.from.block], w.from.port) === 'out') {
          outsideWireBlocks.add(w.from.block);
        }
      }
    }
    const allExternals = [...new Set([...externals, ...outsideWireBlocks])];
    const externalKeys = new Set(allExternals);
    const allBlocks = [
      ...Object.values(view.blocks),
      ...allExternals.flatMap((k) => (graph.blocks[k] ? [externalStub(graph.blocks[k])] : [])),
    ];
    // `Program` blocks are never drawn: the root is just the container of the top-level
    // declarations, so a node for it carries no information. Their bodies (and wires) are still
    // read below; edges ending on a hidden block are dropped since `byKey` no longer has it.
    // A `TypeExpr` is dropped too when no *active* relation category points at it (see
    // `isHiddenTypeMention`) — dropping it can't leave a dangling edge, since the edge that would
    // have justified it is filtered out by the same active set.
    const categoriesByKey = categoriesByBlockKey(graph);
    const blocks = allBlocks.filter(
      (b) =>
        b.kind !== 'Program' &&
        !isHiddenTypeMention(b, view, graph, categoriesByKey, activeRelationKinds),
    );
    const byKey = new Map(blocks.map((b) => [b.key, b]));

    const children = blocks.map((block) => ({
      id: block.key,
      width: NODE_WIDTH,
      height: nodeHeight(block),
      ports: [
        ...block.inputs.map((p, i) => ({
          id: portId(block.key, p.name, 'in'),
          width: 1,
          height: 1,
          x: 0,
          y: portOffsetY(i),
          properties: { 'org.eclipse.elk.port.side': 'WEST' },
        })),
        ...block.outputs.map((p, i) => ({
          id: portId(block.key, p.name, 'out'),
          width: 1,
          height: 1,
          x: NODE_WIDTH,
          y: portOffsetY(i),
          properties: { 'org.eclipse.elk.port.side': 'EAST' },
        })),
      ],
      layoutOptions: { 'elk.portConstraints': 'FIXED_POS' },
    }));

    // A block's wires aren't guaranteed to live in its own `body` — see the étape 2 pitfall in
    // the spec's implementation notes (a wire is recorded wherever the builder's `owner` was at
    // the moment it was created, which can be a distant descendant). At one level of view, only
    // wires between two blocks *both* present here can be drawn; a wire reaching past this
    // level's boundary is dropped rather than rendered as a dangling edge (the CLI's DOT export
    // tolerates that via Graphviz auto-vivifying a bare node — React Flow has no such grace).
    //
    // Each endpoint's side (WEST/`in` vs EAST/`out`) has to be looked up on its own block, not
    // assumed from whether it's the wire's `from` or `to`: the focus block's own *input* is
    // routinely the *source* of a wire inside its body (e.g. `sq`'s parameter `n` feeding
    // `n * n`), and the reverse happens for its own output. Getting this backwards makes ELK
    // reject the edge outright ("Referenced shape does not exist").
    const wires = allBlocks
      .flatMap((b) => b.body?.wires ?? [])
      .filter((w) => {
        const fromSide = portSide(byKey.get(w.from.block), w.from.port);
        const toSide = portSide(byKey.get(w.to.block), w.to.port);
        return fromSide !== null && toSide !== null;
      });

    const wireEdges = wires.map((w, i) => ({
      id: `w${i}`,
      sources: [portId(w.from.block, w.from.port, portSide(byKey.get(w.from.block), w.from.port)!)],
      targets: [portId(w.to.block, w.to.port, portSide(byKey.get(w.to.block), w.to.port)!)],
    }));

    // Relation edges (spec §11) connect block to block, not port to port — their target is often
    // a block with no data port on that side at all (e.g. a `TypeDecl` has no inputs). ELK accepts
    // a plain node id as an edge endpoint alongside FIXED_POS-port edges in the same layout call.
    const visibleRelationEdges = relationEdges.filter((e) => byKey.has(e.from) && byKey.has(e.to));
    const relationElkEdges = visibleRelationEdges.map((e) => ({ id: e.id, sources: [e.from], targets: [e.to] }));

    elk
      .layout({
        id: 'root',
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': 'RIGHT',
          'elk.spacing.nodeNode': '96',
          'elk.layered.spacing.nodeNodeBetweenLayers': '110',
          'elk.layered.spacing.edgeNodeBetweenLayers': '32',
          'elk.spacing.edgeNode': '36',
        },
        children,
        edges: [...wireEdges, ...relationElkEdges],
      } as ElkNode)
      .then((result) => {
        if (cancelled) return;
        const nodes: LaidOutNode[] = (result.children ?? []).map((c) => ({
          key: c.id,
          x: c.x ?? 0,
          y: c.y ?? 0,
          width: c.width ?? NODE_WIDTH,
          height: c.height ?? 0,
          external: externalKeys.has(c.id) || undefined,
        }));
        const laidOutEdges: LaidOutEdge[] = [
          ...wires.map((w, i) => ({
            id: `w${i}`,
            sourceKey: w.from.block,
            sourcePort: w.from.port as string | null,
            targetKey: w.to.block,
            targetPort: w.to.port as string | null,
          })),
          ...visibleRelationEdges.map((e) => ({
            id: e.id,
            sourceKey: e.from,
            sourcePort: null,
            targetKey: e.to,
            targetPort: null,
            category: e.category,
          })),
        ];
        const width = nodes.reduce((m, n) => Math.max(m, n.x + n.width), 0);
        const height = nodes.reduce((m, n) => Math.max(m, n.y + n.height), 0);
        setLayout({ nodes, edges: laidOutEdges, width, height });
        setLoading(false);
      })
      .catch((e: unknown) => {
        console.error('ELK layout failed:', e);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);

  return { layout, loading };
}
