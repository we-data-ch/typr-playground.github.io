// The block-graph data model (`visualization_graph_v2.md` §3-§9) and the pure logic the
// playground's Graph tab needs on top of it. Field names mirror
// `crates/typr-graph/src/model.rs`/`key.rs` in the compiler repo verbatim — that Rust module's
// own header says the field names *are* the external JSON contract, so this file is a
// translation, not a reinterpretation. No React here; components in `components/graph/` consume
// these types and functions.

export type BlockKind =
  | 'Program'
  | 'Literal'
  | 'Operator'
  | 'Apply'
  | 'Scope'
  | 'Function'
  | 'Record'
  | 'Access'
  | 'TypeDecl'
  | 'TypeExpr'
  | 'Interface'
  | 'If'
  | 'Tuple'
  | 'Array'
  | 'Opaque'
  | 'Loop'
  | 'Match'
  | 'Module'
  | 'RCode';

export type Origin = 'User' | 'Std' | { RPackage: string };

export type Visibility = 'Public' | 'Private';

export interface Span {
  file: string;
  start: number;
  end: number;
}

export interface Port {
  name: string;
  type?: string;
  implicit: boolean;
  visibility: Visibility;
}

export interface PortRef {
  block: string;
  port: string;
}

export interface Wire {
  from: PortRef;
  to: PortRef;
}

export interface Body {
  children: string[];
  wires: Wire[];
}

export interface Block {
  key: string;
  kind: BlockKind;
  name?: string;
  span?: Span;
  type?: string;
  inputs: Port[];
  outputs: Port[];
  origin: Origin;
  body?: Body;
}

export type Confidence =
  | { confidence: 'exact' }
  | { confidence: 'by_name' }
  | { confidence: 'ambiguous'; candidates: string[] };

export type RelationKind =
  | 'Ref'
  | 'HasType'
  | 'TypePosition'
  | 'Satisfies'
  | 'DeclaredAs'
  | 'Subtype'
  | 'Instantiates';

export interface Evidence {
  requires: string;
  provided_by: string;
}

export interface Relation {
  kind: RelationKind;
  from: string;
  to: string;
  port?: string;
  index?: number;
  confidence?: Confidence;
  evidence?: Evidence[];
}

export interface BlockGraph {
  format: string;
  version: number;
  root: string;
  blocks: Record<string, Block>;
  relations: Relation[];
}

/** The three relation kinds the Graph tab can draw as a colored, directed edge (spec §11
 *  "Relations comme arêtes"). Every other relation (`Satisfies`, `DeclaredAs`, `Subtype`,
 *  `Instantiates`, a `TypePosition` with `index != 0`, a plain non-capture `Ref`) stays
 *  text-only in the detail panel. */
export type RelationEdgeCategory = 'capture' | 'typePosition0' | 'hasType';

export interface RelationEdge {
  id: string;
  category: RelationEdgeCategory;
  from: string;
  to: string;
}

/**
 * Classifies a relation into one of the three colored categories, or `null` if it isn't one.
 *
 * A `Ref` is a *capture* iff its origin port is one the builder allocated as implicit
 * (`take_captures` in `crates/typr-graph/src/build/mod.rs` always pairs `Port::implicit(name, …)`
 * with a `Ref` on that same port name) — checked here via `implicit: true` on the matching port of
 * the `from` block's `inputs`. A `Ref` whose port is explicit (`callee`, `arg0`, a rename's
 * `value`, …) or absent is a plain reference, not a capture.
 */
export function relationCategory(view: BlockGraph, relation: Relation): RelationEdgeCategory | null {
  if (relation.kind === 'HasType') return 'hasType';
  if (relation.kind === 'TypePosition') return relation.index === 0 ? 'typePosition0' : null;
  if (relation.kind === 'Ref' && relation.port) {
    const port = view.blocks[relation.from]?.inputs.find((p) => p.name === relation.port);
    if (port?.implicit) return 'capture';
  }
  return null;
}

/**
 * The relations of a one-level view (`oneLevel`) that can be drawn as edges: classified into one
 * of the three colored categories, with both endpoints present as nodes in `view` — a relation
 * reaching past this level's boundary has nowhere to attach (same rule `useElkLayout` already
 * applies to wires) and is dropped here rather than rendered dangling.
 */
export function relationEdgesInView(view: BlockGraph): RelationEdge[] {
  return view.relations.flatMap((r, i) => {
    if (!view.blocks[r.from] || !view.blocks[r.to]) return [];
    const category = relationCategory(view, r);
    return category ? [{ id: `rel${i}`, category, from: r.from, to: r.to }] : [];
  });
}

/**
 * The one-level view centered on `focus` (spec §11's "un niveau rendu à la fois"): `focus`
 * itself plus its direct children, and every relation with at least one endpoint in that set.
 * `null` if `focus` isn't a block of this graph. Ports `BlockGraph::one_level` (model.rs) verbatim.
 */
export function oneLevel(graph: BlockGraph, focus: string): BlockGraph | null {
  const block = graph.blocks[focus];
  if (!block) return null;

  const blocks: Record<string, Block> = { [focus]: block };
  const scope = new Set<string>([focus]);

  if (block.body) {
    for (const child of block.body.children) {
      const childBlock = graph.blocks[child];
      if (childBlock) {
        blocks[child] = childBlock;
        scope.add(child);
      }
    }
  }

  const relations = graph.relations.filter((r) => scope.has(r.from) || scope.has(r.to));

  return { format: graph.format, version: graph.version, root: focus, blocks, relations };
}

/** The immediate parent's key (`val:norm2/a` → `val:norm2`), or `null` for a top-level key. */
export function parentKey(key: string): string | null {
  const idx = key.lastIndexOf('/');
  return idx === -1 ? null : key.slice(0, idx);
}

/** The top-level declaration a nested key lives under; a top-level key is its own ancestor. */
export function topLevelAncestor(key: string): string {
  const idx = key.indexOf('/');
  return idx === -1 ? key : key.slice(0, idx);
}

/**
 * The innermost block whose span covers `offset` (a byte offset into the source, spec §11's
 * "clic dans Monaco : le graphe se place sur le bloc le plus interne qui contient le curseur") —
 * searches the whole graph, not just a one-level view, since the containing block can be
 * arbitrarily deep. `null` if no block's span covers the offset.
 */
export function findInnermostBlock(graph: BlockGraph, offset: number): string | null {
  let best: string | null = null;
  let bestLength = Infinity;

  for (const block of Object.values(graph.blocks)) {
    const span = block.span;
    if (!span || span.start > offset || offset > span.end) continue;
    const length = span.end - span.start;
    if (length < bestLength) {
      best = block.key;
      bestLength = length;
    }
  }

  return best;
}

/**
 * Alt+clic / "aller à la définition" (spec §11): follows a `Ref` relation from `blockKey` (or an
 * ancestor of it, since the wire is often recorded a few levels down — see the étape 2 pitfall
 * about wires not always living in their owner's own body) to its target, landing on the target
 * itself if it can be entered (has a body) or on its nearest enterable ancestor otherwise.
 */
export function resolveDefinition(graph: BlockGraph, blockKey: string): string | null {
  let candidate: string | null = blockKey;
  while (candidate) {
    const ref = graph.relations.find((r) => r.kind === 'Ref' && r.from === candidate);
    if (ref) {
      const target = graph.blocks[ref.to];
      if (!target) return null;
      return target.body ? target.key : topLevelAncestor(target.key);
    }
    candidate = parentKey(candidate);
  }
  return null;
}

/**
 * `Span.start`/`end` are UTF-8 **byte** offsets (`nom_locate::LocatedSpan::location_offset()`),
 * while Monaco indexes a JS string in UTF-16 code units. Identity for ASCII source; only differs
 * once a multi-byte character (accents in a French comment, an emoji, …) appears before the
 * offset.
 */
export function byteOffsetToJsOffset(text: string, byteOffset: number): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    if (bytes >= byteOffset) return i;
    bytes += utf8ByteLength(text.codePointAt(i)!);
    if (text.codePointAt(i)! > 0xffff) i++; // surrogate pair: one code point, two UTF-16 units
  }
  return text.length;
}

/** The inverse of `byteOffsetToJsOffset`: a JS string index (UTF-16) to a UTF-8 byte offset. */
export function jsOffsetToByteOffset(text: string, jsOffset: number): number {
  let bytes = 0;
  for (let i = 0; i < jsOffset && i < text.length; i++) {
    bytes += utf8ByteLength(text.codePointAt(i)!);
    if (text.codePointAt(i)! > 0xffff) i++;
  }
  return bytes;
}

function utf8ByteLength(codePoint: number): number {
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
}
