import { useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Editor } from './components/Editor';
import { Output, StatusBar } from './components/Output';
import { useTheme } from './hooks/useTheme';
import { usePlayground } from './hooks/usePlayground';
import type { Example } from './lib/examples';
import { buildShareUrl } from './lib/share';
import './styles/theme.css';
import './styles/App.css';

function App() {
  const { theme, toggleTheme } = useTheme();
  const {
    code,
    output,
    error,
    warnings,
    status,
    typrReady,
    webRStatus,
    embed,
    setCode,
    run,
    share,
    isReady,
  } = usePlayground();

  const handleSelectExample = useCallback((example: Example) => {
    setCode(example.code);
  }, [setCode]);

  const isRunning = status === 'compiling' || status === 'running';

  // En mode embarqué, le lien « plein écran » doit transporter le code courant :
  // le visiteur a pu l'éditer dans l'iframe avant de cliquer.
  const fullPlaygroundUrl = useMemo(
    () => (embed ? buildShareUrl(code) : null),
    [embed, code],
  );

  return (
    <div className={embed ? 'app app-embed' : 'app'}>
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onRun={run}
        onShare={share}
        onSelectExample={handleSelectExample}
        isRunning={isRunning}
        isReady={isReady}
        embed={embed}
        fullPlaygroundUrl={fullPlaygroundUrl}
      />

      <main className="main">
        <section className="editor-panel">
          <div className="panel-header">
            <span className="panel-title">TypR Code</span>
          </div>
          <div className="panel-content">
            <Editor
              value={code}
              onChange={setCode}
              theme={theme}
              onRun={run}
            />
          </div>
        </section>

        <section className="output-panel">
          <div className="panel-header">
            <span className="panel-title">Output</span>
          </div>
          <div className="panel-content">
            <Output
              output={output}
              error={error}
              warnings={warnings}
              status={status}
            />
          </div>
        </section>
      </main>

      <StatusBar
        typrReady={typrReady}
        webRStatus={webRStatus}
      />
    </div>
  );
}

export default App;
