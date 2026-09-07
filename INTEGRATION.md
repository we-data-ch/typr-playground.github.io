# Ouvrir le playground depuis la documentation

Ce document décrit le contrat entre le playground et un site tiers — en
pratique la documentation officielle, [typr.github.io](https://github.com/we-data-ch/typr.github.io).
L'implémentation de référence est `src/lib/share.ts` et `src/lib/embed.ts` :
la doc ne partage aucun code avec le playground, elle se contente de produire
des liens (ou des messages) conformes à ce qui suit.

URL publique du playground :

```
https://we-data-ch.github.io/typr-playground.github.io/
```

## 1. Paramètres d'URL

| Paramètre | Valeur | Effet |
| --- | --- | --- |
| `src` | `encodeURIComponent(code)` | Charge le code dans l'éditeur. Format le plus simple à générer. |
| `code` | `base64url(utf8(code))` | Idem, mais compact. Prioritaire sur `src`. C'est ce que produit le bouton *Share*. |
| `run` | `1` | Compile et exécute dès que le compilateur et WebR sont prêts. |
| `theme` | `dark` \| `light` | Force le thème pour cette visite, sans écraser la préférence enregistrée du visiteur. |
| `embed` | `1` | Chrome réduit (pas de menu *Examples*, bouton « Playground » vers la version plein écran). Pour les `<iframe>`. |

Exemples :

```
…/?src=let%20x%3A%20int%20%3C-%2042%3B%0Aprint(x)%3B&run=1
…/?code=bGV0IHg6IGludCA8LSA0MjsKcHJpbnQoeCk7&run=1&theme=dark
```

`base64url` = base64 standard dont les `+` et `/` deviennent `-` et `_`, sans
padding `=`. C'est important : `URLSearchParams` transforme les `+` en espaces,
un base64 standard se retrouverait donc corrompu au décodage.

Générateur, en 5 lignes, sans dépendance (fonctionne dans le navigateur comme
dans Node ≥ 16, donc aussi au build SSR de Docusaurus) :

```ts
function encodeCode(code: string): string {
  const bytes = new TextEncoder().encode(code);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
```

Limite pratique : ~8 000 caractères d'URL. Au-delà, passer par l'`<iframe>`
(section 3).

## 2. Bouton « Playground » sur les blocs de code Docusaurus

La documentation compte plus de 80 blocs ` ```typr `. Plutôt que d'écrire un
lien à la main dans chaque page, on enveloppe le composant de rendu des blocs
de code, une fois pour toutes :

```bash
npm run swizzle @docusaurus/theme-classic CodeBlock -- --wrap --typescript
```

`src/theme/CodeBlock/index.tsx` :

```tsx
import CodeBlock from '@theme-original/CodeBlock';
import type CodeBlockType from '@theme/CodeBlock';
import type {WrapperProps} from '@docusaurus/types';
import styles from './styles.module.css';

type Props = WrapperProps<typeof CodeBlockType>;

const PLAYGROUND_URL = 'https://we-data-ch.github.io/typr-playground.github.io/';

function encodeCode(code: string): string {
  const bytes = new TextEncoder().encode(code);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default function CodeBlockWrapper(props: Props) {
  const code = typeof props.children === 'string' ? props.children.replace(/\n$/, '') : null;
  const language =
    props.language ??
    (typeof props.className === 'string'
      ? /language-(\w+)/.exec(props.className)?.[1]
      : undefined);
  const meta = props.metastring ?? '';

  // `noplayground` sur la clôture du bloc désactive le bouton (extrait
  // volontairement incomplet, pseudo-code, exemple qui doit échouer…).
  if (language !== 'typr' || !code || meta.includes('noplayground')) {
    return <CodeBlock {...props} />;
  }

  const params = new URLSearchParams({code: encodeCode(code)});
  if (meta.includes('autorun')) params.set('run', '1');

  return (
    <div className={styles.wrapper}>
      <CodeBlock {...props} />
      <a
        className={styles.button}
        href={`${PLAYGROUND_URL}?${params}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        ▶ Playground
      </a>
    </div>
  );
}
```

`src/theme/CodeBlock/styles.module.css` — le bouton se place en bas à droite,
le coin haut droit étant déjà occupé par le bouton « copier » de Docusaurus :

```css
.wrapper {
  position: relative;
}

.button {
  position: absolute;
  right: 0.5rem;
  bottom: 1.3rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  line-height: 1.6;
  text-decoration: none;
  color: var(--ifm-color-primary-lightest);
  background: var(--ifm-pre-background);
  border: 1px solid var(--ifm-color-emphasis-300);
  opacity: 0;
  transition: opacity 0.2s;
}

.wrapper:hover .button,
.button:focus {
  opacity: 1;
}

.button:hover {
  text-decoration: none;
  border-color: var(--ifm-color-primary);
}
```

Usage dans les pages, sans rien changer aux blocs existants :

````markdown
```typr
let x: int <- 42;
print(x);
```

```typr autorun
let x: int <- 42;
print(x);
```

```typr noplayground
# extrait de syntaxe, pas un programme complet
type Vector <- Vector[3, int];
```
````

## 3. Playground embarqué en `<iframe>`

Pour exécuter sans quitter la page de documentation :

```html
<iframe
  src="https://we-data-ch.github.io/typr-playground.github.io/?embed=1"
  style="width: 100%; height: 420px; border: 1px solid var(--ifm-color-emphasis-300); border-radius: 8px"
></iframe>
```

Le code peut être poussé par `postMessage`, ce qui évite la limite de longueur
des URL. Le protocole est volontairement minimal :

| Sens | Message |
| --- | --- |
| playground → hôte | `{ type: 'typr-playground:ready' }` — l'iframe est montée et accepte le code |
| hôte → playground | `{ type: 'typr-playground:set-code', code: string, run?: boolean }` |
| playground → hôte | `{ type: 'typr-playground:result', output, error, warnings }` — après chaque exécution |

```js
addEventListener('message', (event) => {
  if (event.data?.type === 'typr-playground:ready') {
    iframe.contentWindow.postMessage(
      {type: 'typr-playground:set-code', code, run: true},
      '*',
    );
  }
});
```

Attendre `ready` est nécessaire : un message envoyé avant le montage de l'iframe
est perdu. Le playground n'accepte que ces messages et ne lit rien chez l'hôte.

Le premier chargement embarqué reste lourd (WebR télécharge son runtime R) :
prévoir l'iframe pour quelques exemples clés, et le lien de la section 2 pour
tous les autres blocs.
