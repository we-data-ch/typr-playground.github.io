import MonacoEditor from '@monaco-editor/react';
import type { OnMount, BeforeMount } from '@monaco-editor/react';
import { useCallback, useRef } from 'react';
import {
  registerTypRLanguage,
  defineTypRTheme,
  TYPR_LANGUAGE_ID,
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

  // Register language before mount
  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    if (!languageRegistered) {
      registerTypRLanguage(monaco);
      defineTypRTheme(monaco);
      languageRegistered = true;
    }
    monacoRef.current = monaco;
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    // Add keyboard shortcut for running code
    editor.addAction({
      id: 'run-code',
      label: 'Run Code',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: () => onRun?.(),
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
  }, [onRun]);

  const handleChange = useCallback((value: string | undefined) => {
    onChange(value ?? '');
  }, [onChange]);

  // Determine theme name
  const monacoTheme = theme === 'dark' ? 'typr-dark' : 'typr-light';

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
