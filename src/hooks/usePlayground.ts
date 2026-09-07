import { useState, useCallback, useEffect, useRef } from 'react';
import { initTypR, compileTypR } from '../lib/typr-wasm';
import { initWebR, runR, type WebRStatus } from '../lib/webr';
import { defaultCode } from '../lib/examples';
import { readSharedParams, buildShareUrl } from '../lib/share';
import { onHostMessage, postToHost, READY, RESULT } from '../lib/embed';

export type { WebRStatus };
export type PlaygroundStatus = 'idle' | 'compiling' | 'running' | 'error';

export interface PlaygroundState {
  code: string;
  output: string;
  error: string | null;
  warnings: string | null;
  status: PlaygroundStatus;
  typrReady: boolean;
  webRStatus: WebRStatus;
}

export function usePlayground() {
  // Les paramètres d'URL sont lus avant le premier rendu : sinon un lien venant
  // de la documentation affiche brièvement l'exemple par défaut avant son code.
  const [sharedParams] = useState(() => readSharedParams());

  const [state, setState] = useState<PlaygroundState>({
    code: sharedParams.code ?? defaultCode,
    output: '',
    error: null,
    warnings: null,
    status: 'idle',
    typrReady: false,
    webRStatus: 'idle',
  });

  const runIdRef = useRef(0);
  const pendingAutorunRef = useRef(sharedParams.autorun && sharedParams.code !== null);

  // Initialize TypR WASM
  useEffect(() => {
    initTypR()
      .then(() => {
        setState(s => ({ ...s, typrReady: true }));
      })
      .catch(e => {
        console.error('Failed to init TypR:', e);
        setState(s => ({ ...s, error: 'Failed to load TypR compiler' }));
      });
  }, []);

  // Initialize WebR
  useEffect(() => {
    initWebR((status) => {
      setState(s => ({ ...s, webRStatus: status }));
    }).catch(e => {
      console.error('Failed to init WebR:', e);
    });
  }, []);

  const setCode = useCallback((code: string) => {
    setState(s => ({ ...s, code, error: null, warnings: null }));
  }, []);

  const run = useCallback(async () => {
    if (!state.typrReady) {
      setState(s => ({ ...s, error: 'TypR compiler not ready' }));
      return;
    }

    if (state.webRStatus !== 'ready') {
      setState(s => ({ ...s, error: 'WebR is still loading, please wait...' }));
      return;
    }

    const currentRunId = ++runIdRef.current;

    setState(s => ({ ...s, status: 'compiling', output: '', error: null, warnings: null }));

    // Step 1: Compile TypR to R
    const { rCode, errors: compileErrors, typeWarnings } = compileTypR(state.code);

    if (currentRunId !== runIdRef.current) return;

    if (compileErrors) {
      setState(s => ({
        ...s,
        status: 'error',
        error: compileErrors,
        warnings: null,
      }));
      postToHost({ type: RESULT, output: '', error: compileErrors, warnings: null });
      return;
    }

    // Step 2: Execute R code with WebR (even if there are type warnings)
    setState(s => ({ ...s, status: 'running', warnings: typeWarnings }));

    const result = await runR(rCode);

    if (currentRunId !== runIdRef.current) return;

    if (result.error) {
      setState(s => ({
        ...s,
        status: 'error',
        error: result.error,
        warnings: typeWarnings,
      }));
    } else {
      setState(s => ({
        ...s,
        status: 'idle',
        output: result.output || '(no output)',
        error: null,
        warnings: typeWarnings,
      }));
    }

    postToHost({
      type: RESULT,
      output: result.error ? '' : result.output,
      error: result.error ?? null,
      warnings: typeWarnings,
    });
  }, [state.typrReady, state.webRStatus, state.code]);

  const format = useCallback(() => {
    // TODO: Implement code formatting
  }, []);

  const share = useCallback(() => {
    navigator.clipboard.writeText(buildShareUrl(state.code));
  }, [state.code]);

  const isReady = state.typrReady && state.webRStatus === 'ready';

  // `?run=1` : la documentation peut demander un lancement automatique, une fois
  // seulement, quand les deux runtimes ont fini de charger. Le déclenchement
  // passe par une microtâche pour ne pas relancer un rendu depuis l'effet.
  useEffect(() => {
    if (!pendingAutorunRef.current || !isReady) return;
    pendingAutorunRef.current = false;
    queueMicrotask(() => { void run(); });
  }, [isReady, run]);

  // Intégration en <iframe> : la page hôte peut pousser du code sans passer par
  // l'URL, ce qui lève la limite de longueur.
  useEffect(() => {
    const stop = onHostMessage(({ code, run: shouldRun }) => {
      setState(s => ({ ...s, code, error: null, warnings: null }));
      if (shouldRun) pendingAutorunRef.current = true;
    });
    postToHost({ type: READY });
    return stop;
  }, []);

  return {
    ...state,
    embed: sharedParams.embed,
    initialTheme: sharedParams.theme,
    setCode,
    run,
    format,
    share,
    isReady,
    isLoading: !state.typrReady || state.webRStatus === 'loading',
  };
}
