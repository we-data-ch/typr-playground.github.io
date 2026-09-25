import { useCallback, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { Editor } from './components/Editor';
import { Output, StatusBar } from './components/Output';
import { GraphView } from './components/graph/GraphView';
import { useTheme } from './hooks/useTheme';
import { usePlayground } from './hooks/usePlayground';
import { useGraphNav } from './hooks/useGraphNav';
import { useSemanticGraph } from './hooks/useSemanticGraph';
import { findInnermostBlock, parentKey } from './lib/graph';
import type { Example } from './lib/examples';
import { buildShareUrl } from './lib/share';
import './styles/theme.css';
import './styles/App.css';
import './styles/graph.css';

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

  const nav = useGraphNav();
  const graphActive = nav.view === 'graph';
  const graphState = useSemanticGraph(code, graphActive, typrReady);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const handleSelectExample = useCallback((example: Example) => {
    setCode(example.code);
  }, [setCode]);

  const handleEnter = useCallback((key: string) => {
    nav.goToBlock(key);
    setSelectedKey(null);
  }, [nav]);

  const openGraphTab = useCallback(() => {
    const focus = nav.focus ?? graphState.graph?.root ?? 'val:@program';
    nav.goToBlock(focus);
  }, [nav, graphState.graph]);

  const openOutputTab = useCallback(() => {
    nav.backToCode();
    setSelectedKey(null);
  }, [nav]);

  // Monaco → graphe (§11) : le curseur se déplace, le graphe se recentre sur le bloc le plus
  // interne qui le contient — une synchronisation passive (`syncFocus`, pas `goToBlock`), pour ne
  // pas empiler une entrée d'historique à chaque clic dans l'éditeur.
  const handleCursorByteOffset = useCallback((offset: number) => {
    if (!graphActive || !graphState.graph) return;
    const inner = findInnermostBlock(graphState.graph, offset);
    if (!inner) return;
    nav.syncFocus(parentKey(inner) ?? graphState.graph.root);
    setSelectedKey(inner);
  }, [graphActive, graphState.graph, nav]);

  // Graphe → Monaco (§11) : le bloc sélectionné détermine la plage à surligner dans l'éditeur.
  const highlightSpan = useMemo(() => {
    if (!graphActive || !selectedKey || !graphState.graph) return null;
    const span = graphState.graph.blocks[selectedKey]?.span;
    return span ? { start: span.start, end: span.end } : null;
  }, [graphActive, selectedKey, graphState.graph]);

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
              onCursorByteOffset={handleCursorByteOffset}
              highlightSpan={highlightSpan}
            />
          </div>
        </section>

        <section className="output-panel">
          <div className="panel-header">
            <div className="tabs">
              <button className={`tab ${!graphActive ? 'active' : ''}`} onClick={openOutputTab}>
                Output
              </button>
              <button className={`tab ${graphActive ? 'active' : ''}`} onClick={openGraphTab}>
                Graph
              </button>
            </div>
          </div>
          <div className="panel-content">
            {graphActive ? (
              <GraphPane
                focus={nav.focus}
                graphState={graphState}
                selectedKey={selectedKey}
                onSelectKey={setSelectedKey}
                onEnter={handleEnter}
              />
            ) : (
              <Output
                output={output}
                error={error}
                warnings={warnings}
                status={status}
              />
            )}
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

interface GraphPaneProps {
  focus: string | null;
  graphState: ReturnType<typeof useSemanticGraph>;
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
  onEnter: (key: string) => void;
}

function GraphPane({ focus, graphState, selectedKey, onSelectKey, onEnter }: GraphPaneProps) {
  if (graphState.hasErrors) {
    return (
      <div className="output-content">
        <div className="output-warnings">
          <div className="output-warnings-header">Le graphe demande un code qui type-check</div>
          <pre className="output-warnings-content">{graphState.errors}</pre>
        </div>
      </div>
    );
  }

  if (!graphState.graph) {
    return <div className="graph-empty">{graphState.loading ? 'Construction du graphe…' : 'En attente…'}</div>;
  }

  const effectiveFocus = focus ?? graphState.graph.root;

  return (
    <GraphView
      graph={graphState.graph}
      focus={effectiveFocus}
      selectedKey={selectedKey}
      onSelectKey={onSelectKey}
      onEnter={onEnter}
    />
  );
}

export default App;
