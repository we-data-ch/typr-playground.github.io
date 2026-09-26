/** True when `el` is (or is inside) something that consumes normal typing — a form control, a
 *  contenteditable, or Monaco's hidden textarea — so a global keyboard shortcut (graph nav,
 *  `/` search) should stand down and let the keystroke through untouched. */
export function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable) return true;
  return el.closest('.monaco-editor') !== null;
}
