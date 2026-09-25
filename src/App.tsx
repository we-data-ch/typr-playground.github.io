import { useCallback, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { Editor } from './components/Editor';
import { Output, StatusBar } from './components/Output';
import { GraphView } from './components/graph/GraphView';
import { DiffSummary } from './components/graph/DiffSummary';
import { useTheme } from './hooks/useTheme';
import { usePlayground } from './hooks/usePlayground';
import { useGraphNav } from './hooks/useGraphNav';
import { useSemanticGraph } from './hooks/useSemanticGraph';
import { useGraphDiff } from './hooks/useGraphDiff';
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

  // Diff tab (`visualization_graph_v2.md` §12 étape 6): local-only state, deliberately kept out
  // of `useGraphNav`/the shared URL contract — a baseline is a whole second source file, not a
  // block key, so it doesn't belong in a shareable link the way `view`/`focus` do.
  const [diffActive, setDiffActive] = useState(false);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [diffFocus, setDiffFocus] = useState<string | null>(null);
  const diffState = useGraphDiff(baseline, code, diffActive, typrReady);

  const handleSelectExample = useCallback((example: Example) => {
    setCode(example.code);
  }, [setCode]);

  const handleEnter = useCallback((key: string) => {
    nav.goToBlock(key);
    setSelectedKey(null);
  }, [nav]);

  const openGraphTab = useCallback(() => {
    setDiffActive(false);
    const focus = nav.focus ?? graphState.graph?.root ?? 'val:@program';
    nav.goToBlock(focus);
  }, [nav, graphState.graph]);

  const openOutputTab = useCallback(() => {
    setDiffActive(false);
    nav.backToCode();
    setSelectedKey(null);
  }, [nav]);

  const openDiffTab = useCallback(() => {
    setDiffActive(true);
    setSelectedKey(null);
    // First visit: snapshot the code as it stands right now as the reference to compare
    // against. A later, explicit "Marquer comme référence" click (`resetBaseline`) is the only
    // other way this changes — reopening the tab never silently moves the goalposts.
    setBaseline((b) => b ?? code);
  }, [code]);

  const resetBaseline = useCallback(() => {
    setBaseline(code);
  }, [code]);

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
              <button className={`tab ${!graphActive && !diffActive ? 'active' : ''}`} onClick={openOutputTab}>
                Output
              </button>
              <button className={`tab ${graphActive && !diffActive ? 'active' : ''}`} onClick={openGraphTab}>
                Graph
              </button>
              <button className={`tab ${diffActive ? 'active' : ''}`} onClick={openDiffTab}>
                Diff
              </button>
            </div>
          </div>
          <div className="panel-content">
            {diffActive ? (
              <DiffPane
                diffState={diffState}
                focus={diffFocus}
                selectedKey={selectedKey}
                onSelectKey={setSelectedKey}
                onEnter={setDiffFocus}
                onResetBaseline={resetBaseline}
              />
            ) : graphActive ? (
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

interface DiffPaneProps {
  diffState: ReturnType<typeof useGraphDiff>;
  focus: string | null;
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
  onEnter: (key: string) => void;
  onResetBaseline: () => void;
}

function DiffPane({ diffState, focus, selectedKey, onSelectKey, onEnter, onResetBaseline }: DiffPaneProps) {
  if (diffState.hasErrors) {
    return (
      <div className="output-content">
        <div className="output-warnings">
          <div className="output-warnings-header">Le diff demande un code qui type-check des deux côtés</div>
          <pre className="output-warnings-content">{diffState.errors}</pre>
        </div>
      </div>
    );
  }

  if (!diffState.diff || !diffState.newGraph || !diffState.oldGraph) {
    return <div className="graph-empty">{diffState.loading ? 'Calcul du diff…' : 'En attente…'}</div>;
  }

  const effectiveFocus = focus ?? diffState.newGraph.root;

  return (
    <div className="diff-view">
      <DiffSummary diff={diffState.diff} oldGraph={diffState.oldGraph} onResetBaseline={onResetBaseline} />
      <div className="diff-graph-container">
        <GraphView
          graph={diffState.newGraph}
          focus={effectiveFocus}
          selectedKey={selectedKey}
          onSelectKey={onSelectKey}
          onEnter={onEnter}
          diff={diffState.diff}
        />
      </div>
    </div>
  );
}

export default App;
