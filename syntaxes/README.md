# `syntaxes/` — fichier généré, à ne pas éditer

`typr.tmLanguage.json` n'appartient pas à ce dépôt. Il est **généré** par le
compilateur :

```
we-data-ch/typr
  crates/typr-core/src/components/syntax/mod.rs   ← la source de vérité
  typr syntax --target tmlanguage --write          ← le générateur
  editors/vscode/syntaxes/typr.tmLanguage.json     ← le fichier généré
```

et recopié ici par le job `grammar` de la release du compilateur. La CI de ce
dépôt compare la copie à l'original et avertit si elle en diffère.

Ajouter un mot-clé, un opérateur ou un sigil se fait donc **dans le manifeste**,
jamais ici : une modification faite sur cette copie serait écrasée à la
prochaine release, et surtout elle recréerait la divergence que le manifeste a
supprimée — VSCode, le playground, la doc et Vim coloraient six syntaxes
différentes, dont des mots-clés Rust (`impl`, `trait`, `struct`, `enum`) que
TypR n'a jamais eus.
