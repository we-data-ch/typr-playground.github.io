import type { PlaygroundStatus, WebRStatus } from '../hooks/usePlayground';

interface OutputProps {
  output: string;
  error: string | null;
  warnings: string | null;
  status: PlaygroundStatus;
}

export function Output({ output, error, warnings, status }: OutputProps) {
  const renderContent = () => {
    if (status === 'compiling') {
      return (
        <div className="output-loading">
          <div className="spinner" />
          Compiling TypR...
        </div>
      );
    }

    if (status === 'running') {
      return (
        <>
          {warnings && (
            <div className="output-warnings">
              <div className="output-warnings-header">Type Warnings</div>
              <pre className="output-warnings-content">{warnings}</pre>
            </div>
          )}
          <div className="output-loading">
            <div className="spinner" />
            Executing R code...
          </div>
        </>
      );
    }

    if (error) {
      return (
        <>
          {warnings && (
            <div className="output-warnings">
              <div className="output-warnings-header">Type Warnings</div>
              <pre className="output-warnings-content">{warnings}</pre>
            </div>
          )}
          <pre className="output-error">{error}</pre>
        </>
      );
    }

    if (output || warnings) {
      return (
        <>
          {warnings && (
            <div className="output-warnings">
              <div className="output-warnings-header">Type Warnings</div>
              <pre className="output-warnings-content">{warnings}</pre>
            </div>
          )}
          {output && <pre className="output-result">{output}</pre>}
        </>
      );
    }

    return (
      <div className="output-placeholder">
        Press Ctrl+Enter or click Run to execute your code
      </div>
    );
  };

  return (
    <div className="output-content">
      {renderContent()}
    </div>
  );
}

interface StatusBarProps {
  typrReady: boolean;
  webRStatus: WebRStatus;
}

export function StatusBar({ typrReady, webRStatus }: StatusBarProps) {
  const getWebRStatusText = () => {
    switch (webRStatus) {
      case 'idle':
        return 'Initializing...';
      case 'loading':
        return 'Loading WebR...';
      case 'ready':
        return 'Ready';
      case 'error':
        return 'Error';
    }
  };

  return (
    <div className="status-bar">
      <div className="status-left">
        <div className="status-item">
          <span
            className={`status-dot ${typrReady ? 'ready' : 'loading'}`}
          />
          TypR: {typrReady ? 'Ready' : 'Loading...'}
        </div>
        <div className="status-item">
          <span
            className={`status-dot ${
              webRStatus === 'ready'
                ? 'ready'
                : webRStatus === 'error'
                ? 'error'
                : 'loading'
            }`}
          />
          WebR: {getWebRStatusText()}
        </div>
      </div>
      <div className="status-right">
        Ctrl+Enter to run
      </div>
    </div>
  );
}
