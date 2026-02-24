import { useState, useRef, useEffect } from 'react';
import { Play, Moon, Sun, ChevronDown, Share2, Github } from 'lucide-react';
import { examples, type Example } from '../lib/examples';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onRun: () => void;
  onShare: () => void;
  onSelectExample: (example: Example) => void;
  isRunning: boolean;
  isReady: boolean;
}

export function Header({
  theme,
  onToggleTheme,
  onRun,
  onShare,
  onSelectExample,
  isRunning,
  isReady,
}: HeaderProps) {
  const [showExamples, setShowExamples] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        <a href="/" className="logo">
          <img src="/typr-logo.svg" alt="TypR" />
          <span>TypR Playground</span>
        </a>
        <span className="version">v0.4.19</span>
      </div>

      <div className="header-center">
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

        <button
          className="btn btn-primary"
          onClick={onRun}
          disabled={isRunning || !isReady}
          title="Run code (Ctrl+Enter)"
        >
          {isRunning ? (
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
        <button
          className="btn-icon"
          onClick={onShare}
          title="Share code"
        >
          <Share2 size={18} />
        </button>
        
        <a
          href="https://github.com/fabriceHategekimana/typr"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-icon"
          title="GitHub"
        >
          <Github size={18} />
        </a>

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
