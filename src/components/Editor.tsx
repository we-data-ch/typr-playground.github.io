import MonacoEditor from '@monaco-editor/react';
import type { OnMount, BeforeMount } from '@monaco-editor/react';
import { useCallback, useRef } from 'react';
import {
  registerTypRLanguage,
  TYPR_LANGUAGE_ID,
  TYPR_LIGHT_THEME,
  TYPR_DARK_THEME,
} from '../lib/monaco-typr';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  theme: 'light' | 'dark';
  onRun?: () => void;
}

// Track if language is registered
let languageRegistered = false;

export function Editor({ value, onChange, theme, onRun }: EditorProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // Use a ref to always have the latest onRun callback,
  // avoiding stale closure in Monaco editor actions
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

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

    // Focus editor
    editor.focus();
  }, []);

  const handleChange = useCallback((value: string | undefined) => {
    onChange(value ?? '');
  }, [onChange]);

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
