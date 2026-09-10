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

**Implémenté** dans we-data-ch/typr.github.io. Cette section décrit ce qui y
tourne ; elle n'a plus valeur de recette à appliquer, mais de carte à lire quand
un des deux dépôts bouge.

La documentation compte 197 blocs ` ```typr `. Plutôt qu'un lien écrit à la main
dans chaque page, le bouton est ajouté une fois pour toutes au groupe de boutons
d'un bloc de code — à côté de « copier » et « retour à la ligne », dont il hérite
la position et l'apparition au survol.

| Fichier (dépôt de la doc) | Rôle |
| --- | --- |
| `src/playground/url.ts` | l'encodage décrit en section 1, et rien d'autre |
| `src/playground/meta.tsx` | lecture des mots-clés de la fence (`autorun`, `noplayground`) |
| `src/theme/CodeBlock/Buttons/index.tsx` | swizzle du groupe de boutons : y insère le bouton |
| `src/theme/CodeBlock/Buttons/PlaygroundButton/` | le bouton lui-même (un `<a target="_blank">`) |
| `src/theme/CodeBlock/Content/Element.js` | publie la metastring vers le bouton |
| `src/syntax/shiki.ts` | conserve la metastring que Shiki jetait |

Le bouton n'apparaît que sur les blocs dont la langue est `typr` — les blocs
` ```r `, ` ```bash `, ` ```json ` n'ont rien à faire dans un playground TypR.

### Mots-clés de fence

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
# fragment de syntaxe, pas un programme complet
type Vector <- [#N, int];
```
````

`noplayground` compte : sur les 222 blocs ` ```typr ` du site (doc et blog),
177 passent un `typr check` réel. Les 45 autres sont des fragments assumés —
tables de syntaxe, sigils de kind isolés, exemples volontairement invalides,
projets multi-fichiers (`mod person;`), et une poignée de formes documentées que
le compilateur ne sait pas encore lire (`@Logger$log:`, `t.1`, motifs `match`
littéraux, `import Math;`) ; envoyer ceux-là au playground n'offrirait qu'un
message d'erreur, ils portent donc le mot-clé.

Les blocs jouables sont **autoportants** : quand un exemple s'appuie sur les
définitions d'un bloc précédent de la page, celles-ci sont recopiées en tête du
bloc dans un préambule `# --- setup, ... ---`, de façon qu'un clic sur *play*
compile toujours. Le partage a été établi en passant chaque bloc au
compilateur : quand un exemple est ajouté ou corrigé, c'est à l'auteur de le
refaire pour ce bloc-là.

### Deux détails non évidents

**La metastring ne survit pas à Shiki.** Docusaurus la pose en propriété du
`<code>` (remark `codeCompatPlugin`), mais `@shikijs/rehype` remplace le nœud
`<pre>` entier par le sien : tout ce qu'il portait disparaît. Un transformer
Shiki la réécrit sur le nœud produit, sans quoi ` ```typr noplayground ` serait
indiscernable de ` ```typr `.

**Le contexte de bloc de Docusaurus ne la transporte pas non plus.**
`useCodeBlockContext().metadata` donne le code, la langue, le titre et les
lignes — pas la metastring — et `@theme/CodeBlock/Buttons` ne reçoit qu'un
`className`. Le dernier composant qui la voit est
`CodeBlock/Content/Element` : il la republie dans un contexte local
(`src/playground/meta.tsx`) que le bouton consomme.

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
