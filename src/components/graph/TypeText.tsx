import { splitType } from '../../lib/graph';

interface TypeTextProps {
  type: string;
  /** Name → type-block key, from `typeLinks`. */
  links: Record<string, string>;
  /** When set, a linked name becomes a button that navigates to its declaration. */
  onGoToBlock?: (key: string) => void;
}

/** A printed type with the named types the block is tied to (`HasType`) highlighted — the type
 *  the expression was declared *or inferred* to have, made visible in the type text itself. */
export function TypeText({ type, links, onGoToBlock }: TypeTextProps) {
  return (
    <>
      {splitType(type, links).map((seg, i) => {
        if (!seg.key) return <span key={i}>{seg.text}</span>;
        const key = seg.key;
        if (!onGoToBlock) {
          return (
            <mark key={i} className="type-link" title={`Type lié : ${key}`}>
              {seg.text}
            </mark>
          );
        }
        return (
          <mark
            key={i}
            className="type-link type-link-button"
            role="button"
            tabIndex={0}
            title={`Aller à ${key}`}
            onClick={() => onGoToBlock(key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onGoToBlock(key);
              }
            }}
          >
            {seg.text}
          </mark>
        );
      })}
    </>
  );
}
