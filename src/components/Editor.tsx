import MonacoEditor from '@monaco-editor/react';
import type { OnMount, BeforeMount } from '@monaco-editor/react';
import { useCallback, useEffect, useRef } from 'react';
import {
  registerTypRLanguage,
  TYPR_LANGUAGE_ID,
  TYPR_LIGHT_THEME,
  TYPR_DARK_THEME,
} from '../lib/monaco-typr';
import { byteOffsetToJsOffset, jsOffsetToByteOffset } from '../lib/graph';

export interface HighlightSpan {
  /** UTF-8 byte offsets, straight from a `Block.span` (spec §9). */
  start: number;
  end: number;
}

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  theme: 'light' | 'dark';
  onRun?: () => void;
  /** Fires on cursor move with a UTF-8 byte offset — the Graph tab's Monaco→graph sync (§11). */
  onCursorByteOffset?: (offset: number) => void;
  /** A block's span to highlight and reveal — the graph→Monaco half of the sync (§11). */
  highlightSpan?: HighlightSpan | null;
}

// Track if language is registered
let languageRegistered = false;

export function Editor({ value, onChange, theme, onRun, onCursorByteOffset, highlightSpan }: EditorProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // Refs kept current via an effect (not a direct assignment during render) so Monaco's
  // callbacks — registered once in handleMount, never re-subscribed — always see the latest
  // props instead of the ones captured at mount time.
  const onRunRef = useRef(onRun);
  const onCursorByteOffsetRef = useRef(onCursorByteOffset);
  const valueRef = useRef(value);
  useEffect(() => {
    onRunRef.current = onRun;
    onCursorByteOffsetRef.current = onCursorByteOffset;
    valueRef.current = value;
  });

  // Register language before mount
  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    if (!languageRegistered) {
      // Enregistre le langage, la grammaire générée et les deux thèmes d'un coup.
      registerTypRLanguage(monaco);
      languageRegistered = true;
    }
    monacoRef.current = monaco;
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Insert left arrow "<-" with Alt + -
    editor.addAction({
      id: 'insert-left-arrow',
      label: 'Insert Left Arrow (<-)',
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.Minus],
      run: (ed) => {
        const selection = ed.getSelection();
        if (!selection) return;
        ed.executeEdits('insert-left-arrow', [{
          range: selection,
          text: '<-',
        }]);
      },
    });

    // Add keyboard shortcut for running code
    editor.addAction({
      id: 'run-code',
      label: 'Run Code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => onRunRef.current?.(),
    });

    // Add keyboard shortcut for formatting (future)
    editor.addAction({
      id: 'format-code',
      label: 'Format Code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
      run: () => {
        // TODO: Implement formatting
        console.log('Format not yet implemented');
      },
    });

    // Graph tab sync (§11): "clic dans Monaco : le graphe se place sur le bloc le plus interne
    // qui contient le curseur". Registered once here, via a ref, so it always calls the latest
    // callback without re-subscribing on every render.
    editor.onDidChangeCursorPosition((e) => {
      if (!onCursorByteOffsetRef.current) return;
      const model = editor.getModel();
      if (!model) return;
      const jsOffset = model.getOffsetAt(e.position);
      onCursorByteOffsetRef.current(jsOffsetToByteOffset(valueRef.current, jsOffset));
    });

    // Focus editor
    editor.focus();
  }, []);

  const handleChange = useCallback((value: string | undefined) => {
    onChange(value ?? '');
  }, [onChange]);

  // Graph → Monaco half of the sync (§11): selecting a block highlights and reveals its span.
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (!highlightSpan) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    const startJs = byteOffsetToJsOffset(value, highlightSpan.start);
    const endJs = byteOffsetToJsOffset(value, highlightSpan.end);
    const startPos = model.getPositionAt(startJs);
    const endPos = model.getPositionAt(endJs);
    const range = new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column);

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      { range, options: { className: 'graph-highlight-range', inlineClassName: 'graph-highlight-inline' } },
    ]);
    editor.revealRangeInCenter(range);
  }, [highlightSpan, value]);

  // Determine theme name
  const monacoTheme = theme === 'dark' ? TYPR_DARK_THEME : TYPR_LIGHT_THEME;

  return (
    <MonacoEditor
      height="100%"
      language={TYPR_LANGUAGE_ID}
      theme={monacoTheme}
      value={value}
      onChange={handleChange}
      beforeMount={handleBeforeMount}
      onMount={handleMount}
      options={{
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        lineNumbers: 'on',
        glyphMargin: true,
        folding: true,
        foldingHighlight: true,
        lineDecorationsWidth: 10,
        lineNumbersMinChars: 3,
        renderLineHighlight: 'line',
        renderWhitespace: 'selection',
        bracketPairColorization: {
          enabled: true,
        },
        guides: {
          bracketPairs: true,
          indentation: true,
        },
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        padding: { top: 16, bottom: 16 },
        suggest: {
          showKeywords: true,
          showSnippets: true,
          showFunctions: true,
          showVariables: true,
          showClasses: true,
          showInterfaces: true,
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: false,
        },
        parameterHints: {
          enabled: true,
        },
        hover: {
          enabled: true,
          delay: 300,
        },
      }}
    />
  );
}
