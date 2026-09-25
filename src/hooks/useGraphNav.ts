// Navigation state for the Graph tab (`visualization_graph_v2.md` §11): which view is active and
// which block is focused, kept in the URL (`?view=graph&focus=<BlockKey>`) via
// `pushGraphFocus`/`pushCodeView` so the browser's Back/Forward and a reloaded/shared link just
// work, without any React state of its own beyond what's already in the address bar.

import { useCallback, useEffect, useState } from 'react';
import { pushCodeView, pushGraphFocus, readSharedParams, replaceGraphFocus, type SharedView } from '../lib/share';

export interface GraphNav {
  view: SharedView;
  /** The block currently shown in the graph, or `null` when `view` is `'code'`. */
  focus: string | null;
  /** Enters `view=graph`, focused on `key` — a deliberate navigation, pushes history. */
  goToBlock: (key: string) => void;
  /** Alias for `goToBlock`, read at call sites for "entrer dans le bloc" / "aller à la définition". */
  enter: (key: string) => void;
  /** Same as `goToBlock`, but replaces the current history entry instead of pushing a new one —
   *  for passive sync (Monaco cursor → graph), which shouldn't spam Back/Forward. */
  syncFocus: (key: string) => void;
  /** Leaves the graph, back to the Output tab. */
  backToCode: () => void;
}

export function useGraphNav(): GraphNav {
  const [state, setState] = useState(() => {
    const shared = readSharedParams();
    return { view: shared.view, focus: shared.focus };
  });

  useEffect(() => {
    const onPopState = () => {
      const shared = readSharedParams();
      setState({ view: shared.view, focus: shared.focus });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const goToBlock = useCallback((key: string) => {
    pushGraphFocus(key);
    setState({ view: 'graph', focus: key });
  }, []);

  const syncFocus = useCallback((key: string) => {
    setState((s) => {
      if (s.view === 'graph' && s.focus === key) return s;
      replaceGraphFocus(key);
      return { view: 'graph', focus: key };
    });
  }, []);

  const backToCode = useCallback(() => {
    pushCodeView();
    setState({ view: 'code', focus: null });
  }, []);

  return { view: state.view, focus: state.focus, goToBlock, enter: goToBlock, syncFocus, backToCode };
}
