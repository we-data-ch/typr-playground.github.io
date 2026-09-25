// Builds the block-graph diff (`visualization_graph_v2.md` §12 étape 6) for the Diff tab: current
// `code` against a `baseline` snapshot taken earlier in the session (see `App.tsx`'s "Marquer
// comme référence"). Same debounce/only-while-active shape as `useSemanticGraph` — a diff isn't
// needed on every keystroke, only while the tab showing it is open.

import { useEffect, useRef, useState } from 'react';
import { semanticGraphDiffTypR } from '../lib/typr-wasm';
import type { BlockGraph } from '../lib/graph';
import type { GraphDiff } from '../lib/graph-diff';

export interface GraphDiffState {
  diff: GraphDiff | null;
  oldGraph: BlockGraph | null;
  newGraph: BlockGraph | null;
  hasErrors: boolean;
  errors: string;
  loading: boolean;
}

interface Result {
  forBaseline: string | null;
  forCode: string | null;
  diff: GraphDiff | null;
  oldGraph: BlockGraph | null;
  newGraph: BlockGraph | null;
  hasErrors: boolean;
  errors: string;
}

const DEBOUNCE_MS = 300;

export function useGraphDiff(
  baseline: string | null,
  code: string,
  active: boolean,
  typrReady: boolean
): GraphDiffState {
  const [result, setResult] = useState<Result>({
    forBaseline: null,
    forCode: null,
    diff: null,
    oldGraph: null,
    newGraph: null,
    hasErrors: false,
    errors: '',
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active || !typrReady || baseline === null) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setResult({ forBaseline: baseline, forCode: code, ...semanticGraphDiffTypR(baseline, code) });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [baseline, code, active, typrReady]);

  const loading =
    active && typrReady && baseline !== null && (result.forBaseline !== baseline || result.forCode !== code);

  return {
    diff: result.diff,
    oldGraph: result.oldGraph,
    newGraph: result.newGraph,
    hasErrors: result.hasErrors,
    errors: result.errors,
    loading,
  };
}
