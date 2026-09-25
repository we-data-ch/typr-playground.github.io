// Builds the block-graph view (`visualization_graph_v2.md`) for the Graph tab. Only runs while
// that tab is active — recomputing on every keystroke of the Output tab would be pure waste —
// and debounces code changes so a fast typist doesn't trigger a WASM rebuild per keystroke.

import { useEffect, useRef, useState } from 'react';
import { semanticGraphTypR } from '../lib/typr-wasm';
import type { BlockGraph } from '../lib/graph';

export interface SemanticGraphState {
  graph: BlockGraph | null;
  hasErrors: boolean;
  errors: string;
  loading: boolean;
}

interface Result {
  forSource: string | null;
  graph: BlockGraph | null;
  hasErrors: boolean;
  errors: string;
}

const DEBOUNCE_MS = 300;

export function useSemanticGraph(code: string, active: boolean, typrReady: boolean): SemanticGraphState {
  const [result, setResult] = useState<Result>({
    forSource: null,
    graph: null,
    hasErrors: false,
    errors: '',
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active || !typrReady) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setResult({ forSource: code, ...semanticGraphTypR(code) });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [code, active, typrReady]);

  // Derived, not tracked separately: as long as the last computed graph isn't for the current
  // source, a (re)computation is either debouncing or in flight.
  const loading = active && typrReady && result.forSource !== code;

  return { graph: result.graph, hasErrors: result.hasErrors, errors: result.errors, loading };
}
