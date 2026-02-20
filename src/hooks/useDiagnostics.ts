import { useEffect, useRef, useCallback } from 'react';
import { typeCheckTypR } from '../lib/typr-wasm';
import type { editor } from 'monaco-editor';

// Debounce delay for type checking
const DEBOUNCE_MS = 500;

export function useDiagnostics(
  code: string,
  typrReady: boolean,
  monacoRef: React.RefObject<typeof import('monaco-editor') | null>,
  editorRef: React.RefObject<editor.IStandaloneCodeEditor | null>
) {
  const timeoutRef = useRef<number | null>(null);
  const markersRef = useRef<editor.IMarkerData[]>([]);

  const runDiagnostics = useCallback(() => {
    if (!typrReady || !monacoRef.current || !editorRef.current) {
      return;
    }

    const monaco = monacoRef.current;
    const model = editorRef.current.getModel();
    if (!model) return;

    try {
      const result = typeCheckTypR(code);
      const markers: editor.IMarkerData[] = [];

      if (result.hasErrors && result.errors) {
        // Parse error messages and convert to markers
        // Error format varies, try to extract line/column info
        const errorLines = result.errors.split('\n---\n');
        
        for (const errorText of errorLines) {
          if (!errorText.trim()) continue;

          // Try to extract location from error
          // Common patterns: "line X", "at line X", "X:Y"
          const lineMatch = errorText.match(/line\s*(\d+)/i) || 
                           errorText.match(/^(\d+):(\d+)/m);
          
          let startLine = 1;
          let startColumn = 1;
          
          if (lineMatch) {
            startLine = parseInt(lineMatch[1], 10);
            if (lineMatch[2]) {
              startColumn = parseInt(lineMatch[2], 10);
            }
          }

          // Ensure line is within bounds
          const lineCount = model.getLineCount();
          if (startLine > lineCount) startLine = lineCount;
          if (startLine < 1) startLine = 1;

          // Get line length for end column
          const lineLength = model.getLineLength(startLine);

          markers.push({
            severity: monaco.MarkerSeverity.Error,
            message: errorText.trim(),
            startLineNumber: startLine,
            startColumn: startColumn,
            endLineNumber: startLine,
            endColumn: lineLength + 1,
            source: 'typr',
          });
        }
      }

      // Set markers on the model
      monaco.editor.setModelMarkers(model, 'typr', markers);
      markersRef.current = markers;
    } catch (e) {
      // Clear markers on error
      const model = editorRef.current?.getModel();
      if (model && monacoRef.current) {
        monacoRef.current.editor.setModelMarkers(model, 'typr', []);
      }
    }
  }, [code, typrReady, monacoRef, editorRef]);

  // Debounced diagnostics
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(runDiagnostics, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [runDiagnostics]);

  // Clear markers on unmount
  useEffect(() => {
    return () => {
      const model = editorRef.current?.getModel();
      if (model && monacoRef.current) {
        monacoRef.current.editor.setModelMarkers(model, 'typr', []);
      }
    };
  }, [editorRef, monacoRef]);

  return {
    markers: markersRef.current,
    hasErrors: markersRef.current.length > 0,
  };
}
