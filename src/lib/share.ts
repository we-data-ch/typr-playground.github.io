// Contrat d'URL entre le playground et la documentation officielle.
//
// C'est ce module qui fait autorité sur le format : la doc (typr.github.io) se
// contente de produire des liens conformes, elle ne partage aucun code avec le
// playground. Deux paramètres acceptés pour le code source :
//
//   ?src=<encodeURIComponent(code)>   texte brut, trivial à générer, lisible
//   ?code=<base64url(utf8(code))>     compact, utilisé par le bouton Share
//
// `code` gagne si les deux sont présents. Paramètres complémentaires :
//
//   ?run=1              lance l'exécution dès que le compilateur et WebR sont prêts
//   ?theme=dark|light   force le thème (sans écraser la préférence enregistrée)
//   ?embed=1            chrome réduit, pour une intégration en <iframe>
//
// Depuis l'étape 4 du graphe de blocs (visualization_graph_v2.md §11), deux paramètres
// additionnels décrivent la vue active plutôt que le code :
//
//   ?view=graph          ouvre l'onglet Graph (au lieu de l'onglet Output par défaut)
//   ?focus=<BlockKey>     bloc affiché dans le graphe (ex. `val:norm2`, `val:norm2/a`)
//
// Ces deux-là sont gérés séparément de `code`/`theme`/`embed` par `pushGraphFocus`/
// `pushCodeView` (ci-dessous) : ils changent à chaque navigation dans le graphe, via
// `history.pushState`, sans reconstruire l'URL de partage au complet.

export type SharedTheme = 'light' | 'dark';
export type SharedView = 'code' | 'graph';

export interface SharedParams {
  code: string | null;
  autorun: boolean;
  theme: SharedTheme | null;
  embed: boolean;
  view: SharedView;
  focus: string | null;
}

/** Au-delà, les navigateurs et les proxies commencent à tronquer l'URL. */
export const MAX_URL_CODE_LENGTH = 8000;

export function encodeCode(code: string): string {
  const bytes = new TextEncoder().encode(code);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodeCode(encoded: string): string | null {
  // Les anciens liens produisaient du base64 standard : `URLSearchParams`
  // a alors converti les `+` en espaces, on refait le chemin inverse.
  const normalized = encoded.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    return null;
  }

  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }

  return isLegacyPercentEncoded(text) ? decodeURIComponent(text) : text;
}

// Compatibilité : `share()` encodait auparavant en base64(encodeURIComponent(code)).
// Un simple test de présence de `%XX` ne suffit pas — il casserait un source
// contenant « "100%20" » — on exige donc que le texte soit exactement ce
// qu'`encodeURIComponent` aurait produit, ce qui est canonique et vérifiable.
function isLegacyPercentEncoded(text: string): boolean {
  if (!/%[0-9A-Fa-f]{2}/.test(text)) return false;
  try {
    return encodeURIComponent(decodeURIComponent(text)) === text;
  } catch {
    return false;
  }
}

export function readSharedParams(search: string = window.location.search): SharedParams {
  const params = new URLSearchParams(search);

  const encoded = params.get('code');
  const plain = params.get('src');
  const code = encoded ? decodeCode(encoded) : plain;

  const theme = params.get('theme');
  const view = params.get('view');

  return {
    code: code || null,
    autorun: isTruthy(params.get('run')),
    theme: theme === 'dark' || theme === 'light' ? theme : null,
    embed: isTruthy(params.get('embed')),
    view: view === 'graph' ? 'graph' : 'code',
    focus: params.get('focus') || null,
  };
}

/**
 * Navigue vers un bloc du graphe : met à jour `view=graph&focus=<key>` dans l'URL courante par
 * `history.pushState`, sans toucher `code`/`theme`/`embed` ni recharger la page — chaque bloc
 * visité gagne ainsi une entrée d'historique, pour que Précédent/Suivant du navigateur marchent
 * nativement (spec §11).
 */
export function pushGraphFocus(focus: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('view', 'graph');
  url.searchParams.set('focus', focus);
  window.history.pushState({ view: 'graph', focus }, '', url);
}

/** Retour à l'onglet Output : retire `view`/`focus` de l'URL courante. */
export function pushCodeView(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('view');
  url.searchParams.delete('focus');
  window.history.pushState({ view: 'code' }, '', url);
}

/**
 * Comme `pushGraphFocus`, mais par `history.replaceState` : pour la synchronisation passive
 * déclenchée par un déplacement du curseur dans Monaco (§11), qui ne doit pas empiler une entrée
 * d'historique à chaque clic — seule une navigation délibérée dans le graphe (fil d'Ariane,
 * double-clic, Alt+clic) le fait.
 */
export function replaceGraphFocus(focus: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('view', 'graph');
  url.searchParams.set('focus', focus);
  window.history.replaceState({ view: 'graph', focus }, '', url);
}

export interface ShareOptions {
  autorun?: boolean;
  theme?: SharedTheme;
  embed?: boolean;
  /** Base publique du playground ; par défaut, l'origine courante. */
  baseUrl?: string;
}

export function buildShareUrl(code: string, options: ShareOptions = {}): string {
  const base =
    options.baseUrl ??
    `${window.location.origin}${import.meta.env.BASE_URL || window.location.pathname}`;

  const url = new URL(base, window.location.origin);
  url.searchParams.set('code', encodeCode(code));
  if (options.autorun) url.searchParams.set('run', '1');
  if (options.theme) url.searchParams.set('theme', options.theme);
  if (options.embed) url.searchParams.set('embed', '1');

  return url.toString();
}

function isTruthy(value: string | null): boolean {
  return value === '' || value === '1' || value === 'true';
}
