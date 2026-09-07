// Pont postMessage pour l'intégration en <iframe>.
//
// L'URL suffit pour un lien « Ouvrir dans le playground », mais elle plafonne
// vers 8 ko : pour un playground embarqué sous un bloc de code, la page hôte
// pousse plutôt le source par message.
//
//   hôte      -> playground : { type: 'typr-playground:set-code', code, run? }
//   playground -> hôte      : { type: 'typr-playground:ready' }
//                             { type: 'typr-playground:result', output, error, warnings }
//
// Aucune donnée n'est lue chez l'hôte et le seul effet possible est de remplir
// l'éditeur : on accepte donc n'importe quelle origine parente.

export const READY = 'typr-playground:ready';
export const SET_CODE = 'typr-playground:set-code';
export const RESULT = 'typr-playground:result';

export interface SetCodeMessage {
  type: typeof SET_CODE;
  code: string;
  run?: boolean;
}

export function isEmbedded(): boolean {
  return typeof window !== 'undefined' && window.parent !== window;
}

export function onHostMessage(handler: (message: SetCodeMessage) => void): () => void {
  const listener = (event: MessageEvent) => {
    const data = event.data as Partial<SetCodeMessage> | null;
    if (!data || data.type !== SET_CODE || typeof data.code !== 'string') return;
    handler({ type: SET_CODE, code: data.code, run: data.run === true });
  };

  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

export function postToHost(message: Record<string, unknown>): void {
  if (!isEmbedded()) return;
  window.parent.postMessage(message, '*');
}
