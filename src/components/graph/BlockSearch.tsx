// `/` (spec §11 étape 7: "recherche d'un bloc par nom") — a small overlay over the canvas, not a
// modal: filters every block in the *whole* graph (not just the one-level view) by name/key,
// substring + case-insensitive. Its own Up/Down/Enter/Escape are handled here, not by GraphView's
// document-level shortcut listener — that listener stands down for any keystroke while this
// input is focused (`isTypingTarget`), so there's no double-handling to guard against.

import { useEffect, useRef, useState } from 'react';
import type { Block, BlockGraph } from '../../lib/graph';

interface BlockSearchProps {
  graph: BlockGraph;
  onSelect: (key: string) => void;
  onClose: () => void;
}

function matches(block: Block, query: string): boolean {
  const q = query.toLowerCase();
  return (block.name ?? '').toLowerCase().includes(q) || block.key.toLowerCase().includes(q);
}

export function BlockSearch({ graph, onSelect, onClose }: BlockSearchProps) {
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = query.trim()
    ? Object.values(graph.blocks).filter((b) => matches(b, query)).slice(0, 20)
    : [];

  return (
    <div className="block-search">
      <input
        ref={inputRef}
        className="block-search-input"
        type="text"
        placeholder="Rechercher un bloc par nom…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlighted(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = results[highlighted];
            if (target) onSelect(target.key);
          }
        }}
      />
      {results.length > 0 && (
        <ul className="block-search-results">
          {results.map((b, i) => (
            <li key={b.key}>
              <button
                className={`block-search-result ${i === highlighted ? 'highlighted' : ''}`}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => onSelect(b.key)}
              >
                <span className="block-search-result-kind">{b.kind}</span>
                <span className="block-search-result-name mono">{b.name ?? b.key}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && results.length === 0 && <div className="block-search-empty">Aucun résultat</div>}
    </div>
  );
}
