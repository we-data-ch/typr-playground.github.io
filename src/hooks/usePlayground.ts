import { useState, useCallback, useEffect, useRef } from 'react';
import { initTypR, compileTypR } from '../lib/typr-wasm';
import { initWebR, runR, type WebRStatus } from '../lib/webr';
import { defaultCode } from '../lib/examples';

export type { WebRStatus };
export type PlaygroundStatus = 'idle' | 'compiling' | 'running' | 'error';

export interface PlaygroundState {
  code: string;
  output: string;
  error: string | null;
  status: PlaygroundStatus;
  typrReady: boolean;
  webRStatus: WebRStatus;
}

export function usePlayground() {
  const [state, setState] = useState<PlaygroundState>({
    code: defaultCode,
    output: '',
    error: null,
    status: 'idle',
    typrReady: false,
    webRStatus: 'idle',
  });
  
  const runIdRef = useRef(0);

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
    setState(s => ({ ...s, code, error: null }));
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

    setState(s => ({ ...s, status: 'compiling', output: '', error: null }));

    // Step 1: Compile TypR to R
    const { rCode, errors: compileErrors } = compileTypR(state.code);

    if (currentRunId !== runIdRef.current) return;

    if (compileErrors) {
      setState(s => ({
        ...s,
        status: 'error',
        error: compileErrors,
      }));
      return;
    }

    // Step 2: Execute R code with WebR
    setState(s => ({ ...s, status: 'running' }));

    const result = await runR(rCode);

    if (currentRunId !== runIdRef.current) return;

    if (result.error) {
      setState(s => ({
        ...s,
        status: 'error',
        error: result.error,
      }));
    } else {
      setState(s => ({
        ...s,
        status: 'idle',
        output: result.output || '(no output)',
        error: null,
      }));
    }
  }, [state.typrReady, state.webRStatus, state.code]);

  const format = useCallback(() => {
    // TODO: Implement code formatting
  }, []);

  const share = useCallback(() => {
    // Encode code in URL
    const encoded = btoa(encodeURIComponent(state.code));
    const url = `${window.location.origin}${window.location.pathname}?code=${encoded}`;
    navigator.clipboard.writeText(url);
    // Could show a toast here
  }, [state.code]);

  // Load code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('code');
    if (encoded) {
      try {
        const code = decodeURIComponent(atob(encoded));
        setState(s => ({ ...s, code }));
      } catch {
        // Invalid encoding, ignore
      }
    }
  }, []);

  return {
    ...state,
    setCode,
    run,
    format,
    share,
    isReady: state.typrReady && state.webRStatus === 'ready',
    isLoading: !state.typrReady || state.webRStatus === 'loading',
  };
}
