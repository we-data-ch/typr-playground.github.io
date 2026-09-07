import { useState, useRef, useEffect } from 'react';
import { Play, Moon, Sun, ChevronDown, Share2, Github, ExternalLink } from 'lucide-react';
import { examples, type Example } from '../lib/examples';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRun: () => void;
  onShare: () => void;
  onSelectExample: (example: Example) => void;
  isRunning: boolean;
  isReady: boolean;
  /** Chrome réduit pour l'intégration en <iframe> depuis la documentation. */
  embed?: boolean;
  /** Lien vers le playground plein écran, avec le code courant. */
  fullPlaygroundUrl?: string | null;
}

export function Header({
  theme,
  onToggleTheme,
  onRun,
  onShare,
  onSelectExample,
  isRunning,
  isReady,
  embed = false,
  fullPlaygroundUrl = null,
}: HeaderProps) {
  const [showExamples, setShowExamples] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // La version est écrite à côté du WASM par le job `wasm` de release.yml
  // dans le dépôt du compilateur : elle décrit donc toujours le binaire
  // réellement chargé, au lieu d'un numéro codé en dur qui dérive.
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}wasm/version.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setVersion(d?.version ?? null))
      .catch(() => setVersion(null));
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExamples(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <a
          href={embed ? fullPlaygroundUrl ?? '/' : '/'}
          className="logo"
          target={embed ? '_blank' : undefined}
          rel={embed ? 'noopener noreferrer' : undefined}
        >
          <img src={`${import.meta.env.BASE_URL}typr_carre.png`} alt="TypR" />
          <span>TypR Playground</span>
        </a>
        {version && <span className="version">{version}</span>}
      </div>

      <div className="header-center">
        {!embed && (
          <div className="examples-dropdown" ref={dropdownRef}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowExamples(!showExamples)}
            >
              Examples
              <ChevronDown size={16} />
            </button>
            {showExamples && (
              <div className="examples-menu">
                {examples.map((example) => (
                  <button
                    key={example.name}
                    onClick={() => {
                      onSelectExample(example);
                      setShowExamples(false);
                    }}
                  >
                    {example.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          className={`btn ${!isReady ? 'btn-loading' : 'btn-primary'}`}
          onClick={onRun}
          disabled={isRunning || !isReady}
          title="Run code (Ctrl+Enter)"
        >
          {!isReady ? (
            <>
              <div className="spinner" />
              Loading...
            </>
          ) : isRunning ? (
            <>
              <div className="spinner" />
              Running...
            </>
          ) : (
            <>
              <Play size={16} />
              Run
            </>
          )}
        </button>
      </div>

      <div className="header-right">
        {embed ? (
          <a
            href={fullPlaygroundUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            title="Open this code in the full playground"
          >
            <ExternalLink size={16} />
            Playground
          </a>
        ) : (
          <>
            <button
              className="btn-icon"
              onClick={onShare}
              title="Share code"
            >
              <Share2 size={18} />
            </button>

            <a
              href="https://github.com/we-data-ch/typr"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-icon"
              title="GitHub"
            >
              <Github size={18} />
            </a>
          </>
        )}

        <button
          className="btn-icon"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </header>
  );
}