// Monaco Editor configuration for TypR language
// Based on the VSCode extension's tmLanguage and language-configuration

import type { languages } from 'monaco-editor';

// Language ID
export const TYPR_LANGUAGE_ID = 'typr';

// Language configuration (brackets, comments, etc.)
export const typrLanguageConfiguration: languages.LanguageConfiguration = {
  comments: {
    lineComment: '#',
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ['<', '>'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '<', close: '>', notIn: ['string', 'comment'] },
    { open: '"', close: '"', notIn: ['string'] },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
    { open: '`', close: '`', notIn: ['string', 'comment'] },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '<', close: '>' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '`', close: '`' },
  ],
  folding: {
    markers: {
      start: /^\s*#\s*region\b/,
      end: /^\s*#\s*endregion\b/,
    },
  },
  wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
  indentationRules: {
    increaseIndentPattern: /^.*\{[^}]*$|^.*\([^)]*$|^.*\[[^\]]*$/,
    decreaseIndentPattern: /^\s*[}\])]$/,
  },
  onEnterRules: [
    {
      beforeText: /^\s*#.*$/,
      action: { indentAction: 0 }, // None - don't auto-indent comments
    },
    {
      beforeText: /^.*\{\s*$/,
      afterText: /^\s*\}/,
      action: { indentAction: 2 }, // IndentOutdent
    },
    {
      beforeText: /^.*\{\s*$/,
      action: { indentAction: 1 }, // Indent
    },
    {
      beforeText: /^.*\(\s*$/,
      afterText: /^\s*\)/,
      action: { indentAction: 2 },
    },
    {
      beforeText: /^.*\[\s*$/,
      afterText: /^\s*\]/,
      action: { indentAction: 2 },
    },
  ],
};

// Monarch syntax highlighting (equivalent to tmLanguage)
export const typrMonarchLanguage: languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.typr',

  // Keywords
  keywords: [
    'if', 'else', 'match', 'for', 'while', 'loop', 'break', 'continue', 'return',
    'let', 'fn', 'type', 'pub', 'use', 'mod', 'impl', 'trait', 'struct', 'enum',
    'where', 'as', 'in', 'mut',
  ],

  // Type keywords
  typeKeywords: [
    'int', 'num', 'char', 'bool', 'Empty', 'Any',
    'Number', 'String', 'Boolean', 'Integer', 'Character',
    'Option', 'Vec', 'Result', 'List', 'Matrix', 'DataFrame',
    'Function', 'Unit',
  ],

  // Boolean and special constants
  constants: [
    'true', 'false', 'TRUE', 'FALSE',
    'NULL', 'NA', 'NaN', 'Inf',
  ],

  // Common R functions (for highlighting)
  builtinFunctions: [
    'print', 'paste', 'paste0', 'cat', 'sprintf',
    'c', 'list', 'vector', 'matrix', 'array', 'data.frame',
    'length', 'nrow', 'ncol', 'dim', 'names',
    'sum', 'mean', 'median', 'sd', 'var', 'min', 'max', 'range',
    'abs', 'sqrt', 'log', 'log10', 'exp', 'sin', 'cos', 'tan',
    'floor', 'ceiling', 'round', 'trunc',
    'is.null', 'is.na', 'is.numeric', 'is.character', 'is.logical',
    'as.numeric', 'as.character', 'as.logical', 'as.integer',
    'head', 'tail', 'rev', 'sort', 'order', 'unique',
    'which', 'any', 'all', 'ifelse',
    'rep', 'seq', 'seq_along', 'seq_len',
    'lapply', 'sapply', 'mapply', 'apply', 'Map', 'Reduce', 'Filter',
    'subset', 'merge', 'rbind', 'cbind',
    'read.csv', 'write.csv', 'readRDS', 'saveRDS',
    'file.exists', 'dir.exists', 'getwd', 'setwd',
  ],

  // Operators
  operators: [
    '->', '=>', '<-', '|>',
    '==', '!=', '<=', '>=', '<', '>',
    '&&', '||', '!',
    '+', '-', '*', '/', '%', '^',
    '=', ':', '::', '@', '.',
    '&', '|',
  ],

  // Symbols for operator matching
  symbols: /[=><!~?:&|+\-*\/\^%@.]+/,

  // Escape sequences
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  // Tokenizer
  tokenizer: {
    root: [
      // Comments
      [/#.*$/, 'comment'],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-terminated string
      [/"/, 'string', '@string_double'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/'/, 'string', '@string_single'],
      [/`[^`]*`/, 'string.backtick'],

      // Numbers
      [/\b[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?\b/, 'number.float'],
      [/\b[0-9]+[eE][+-]?[0-9]+\b/, 'number.float'],
      [/\b[0-9]+L?\b/, 'number'],

      // Generic type parameters (#T)
      [/#[A-Z][a-zA-Z0-9_]*\b/, 'type.parameter'],

      // Variant access (.Some, .None, .Ok, .Err)
      [/\.[A-Z][a-zA-Z0-9_]*\b/, 'type.variant'],

      // Type annotations after colon
      [/:\s*/, { token: 'delimiter', next: '@type_annotation' }],

      // Function definitions
      [/(fn)(\s+)([a-z_][a-zA-Z0-9_]*)/, ['keyword', 'white', 'entity.name.function']],
      
      // Let bindings with function assignment
      [/(let)(\s+)([a-z_][a-zA-Z0-9_]*)(\s*)(=)(\s*)(fn)/, 
        ['keyword', 'white', 'entity.name.function', 'white', 'operator', 'white', 'keyword']],

      // External function calls (@function_name)
      [/@[a-z_][a-zA-Z0-9_]*/, 'entity.name.function.external'],

      // Function calls
      [/[a-z_][a-zA-Z0-9_]*(?=\s*\()/, {
        cases: {
          '@builtinFunctions': 'support.function',
          '@default': 'entity.name.function',
        },
      }],

      // Keywords, types, constants, identifiers
      [/[a-zA-Z_][a-zA-Z0-9_]*/, {
        cases: {
          '@keywords': 'keyword',
          '@typeKeywords': 'type',
          '@constants': 'constant',
          '@default': 'identifier',
        },
      }],

      // Operators
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': '',
        },
      }],

      // Delimiters
      [/[{}()\[\]]/, '@brackets'],
      [/[<>]/, '@brackets'],
      [/[;,]/, 'delimiter'],

      // Whitespace
      [/\s+/, 'white'],
    ],

    // Type annotation context (after :)
    type_annotation: [
      // Lowercase type keywords (int, num, char, bool)
      [/[a-z][a-zA-Z0-9_]*/, {
        cases: {
          '@typeKeywords': 'type',
          '@default': { token: '@rematch', next: '@pop' },
        },
      }],
      // Uppercase types (Vec, Option, String, etc.)
      [/[A-Z][a-zA-Z0-9_]*/, 'type'],
      // `<-` is the assignment operator, NOT a generic — pop back to root
      [/<-/, { token: '@rematch', next: '@pop' }],
      // `<` alone opens a generic type parameter
      [/</, '@brackets', '@type_generic'],
      [/\|/, 'operator'], // Union types
      [/,/, 'delimiter'],
      [/\s+/, 'white'],
      [/[^A-Za-z0-9_<>,|\s]/, { token: '@rematch', next: '@pop' }],
      [/$/, { token: '', next: '@pop' }],
    ],

    // Generic type parameters
    type_generic: [
      [/[A-Z][a-zA-Z0-9_]*/, 'type'],
      [/</, '@brackets', '@push'],
      [/>/, '@brackets', '@pop'],
      [/,/, 'delimiter'],
      [/\s+/, 'white'],
    ],

    // Double-quoted strings
    string_double: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],

    // Single-quoted strings
    string_single: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop'],
    ],
  },
};

// Completions for TypR
export const typrCompletionItems: languages.CompletionItem[] = [
  // Keywords
  { label: 'let', kind: 14, insertText: 'let ${1:name}: ${2:Type} = ${3:value}', insertTextRules: 4, detail: 'Variable declaration', documentation: 'Declare a new variable with optional type annotation' },
  { label: 'fn', kind: 14, insertText: 'fn(${1:params}): ${2:ReturnType} {\n\t${3}\n}', insertTextRules: 4, detail: 'Function expression', documentation: 'Create an anonymous function' },
  { label: 'if', kind: 14, insertText: 'if (${1:condition}) {\n\t${2}\n}', insertTextRules: 4, detail: 'If statement' },
  { label: 'if else', kind: 14, insertText: 'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}', insertTextRules: 4, detail: 'If-else statement' },
  { label: 'while', kind: 14, insertText: 'while (${1:condition}) {\n\t${2}\n}', insertTextRules: 4, detail: 'While loop' },
  { label: 'for', kind: 14, insertText: 'for (${1:item} in ${2:collection}) {\n\t${3}\n}', insertTextRules: 4, detail: 'For loop' },
  { label: 'match', kind: 14, insertText: 'match ${1:value} {\n\t${2:pattern} => ${3:result},\n}', insertTextRules: 4, detail: 'Pattern matching' },
  { label: 'type', kind: 14, insertText: 'type ${1:Name} = ${2:Definition}', insertTextRules: 4, detail: 'Type alias' },
  { label: 'struct', kind: 14, insertText: 'struct ${1:Name} {\n\t${2:field}: ${3:Type},\n}', insertTextRules: 4, detail: 'Struct definition' },
  { label: 'enum', kind: 14, insertText: 'enum ${1:Name} {\n\t${2:Variant},\n}', insertTextRules: 4, detail: 'Enum definition' },
  { label: 'impl', kind: 14, insertText: 'impl ${1:Type} {\n\t${2}\n}', insertTextRules: 4, detail: 'Implementation block' },
  { label: 'trait', kind: 14, insertText: 'trait ${1:Name} {\n\t${2}\n}', insertTextRules: 4, detail: 'Trait definition' },
  { label: 'use', kind: 14, insertText: 'use ${1:module}', insertTextRules: 4, detail: 'Import statement' },
  { label: 'mod', kind: 14, insertText: 'mod ${1:name}', insertTextRules: 4, detail: 'Module declaration' },
  { label: 'pub', kind: 14, insertText: 'pub ', insertTextRules: 4, detail: 'Public visibility' },

  // Types
  { label: 'Number', kind: 6, insertText: 'Number', detail: 'Numeric type (R numeric)' },
  { label: 'String', kind: 6, insertText: 'String', detail: 'String type (R character)' },
  { label: 'Boolean', kind: 6, insertText: 'Boolean', detail: 'Boolean type (R logical)' },
  { label: 'Integer', kind: 6, insertText: 'Integer', detail: 'Integer type (R integer)' },
  { label: 'Vec', kind: 6, insertText: 'Vec<${1:T}>', insertTextRules: 4, detail: 'Vector type' },
  { label: 'List', kind: 6, insertText: 'List<${1:T}>', insertTextRules: 4, detail: 'List type' },
  { label: 'Option', kind: 6, insertText: 'Option<${1:T}>', insertTextRules: 4, detail: 'Optional type (.Some(value) or .None)' },
  { label: 'Result', kind: 6, insertText: 'Result<${1:T}, ${2:E}>', insertTextRules: 4, detail: 'Result type (.Ok(value) or .Err(error))' },
  { label: 'DataFrame', kind: 6, insertText: 'DataFrame', detail: 'Data frame type' },
  { label: 'Matrix', kind: 6, insertText: 'Matrix<${1:T}>', insertTextRules: 4, detail: 'Matrix type' },
  { label: 'Function', kind: 6, insertText: 'Function<(${1:Args}) -> ${2:Return}>', insertTextRules: 4, detail: 'Function type' },
  { label: 'Any', kind: 6, insertText: 'Any', detail: 'Any type (escape hatch)' },
  { label: 'Unit', kind: 6, insertText: 'Unit', detail: 'Unit type (void/no value)' },

  // Constants
  { label: 'TRUE', kind: 12, insertText: 'TRUE', detail: 'Boolean true' },
  { label: 'FALSE', kind: 12, insertText: 'FALSE', detail: 'Boolean false' },
  { label: 'NULL', kind: 12, insertText: 'NULL', detail: 'Null value' },
  { label: 'NA', kind: 12, insertText: 'NA', detail: 'Missing value' },

  // Common functions
  { label: 'print', kind: 3, insertText: 'print(${1:value})', insertTextRules: 4, detail: 'Print value to console' },
  { label: 'paste', kind: 3, insertText: 'paste(${1:args})', insertTextRules: 4, detail: 'Concatenate strings with space' },
  { label: 'paste0', kind: 3, insertText: 'paste0(${1:args})', insertTextRules: 4, detail: 'Concatenate strings without separator' },
  { label: 'c', kind: 3, insertText: 'c(${1:values})', insertTextRules: 4, detail: 'Create vector' },
  { label: 'length', kind: 3, insertText: 'length(${1:x})', insertTextRules: 4, detail: 'Get length of vector' },
  { label: 'sum', kind: 3, insertText: 'sum(${1:x})', insertTextRules: 4, detail: 'Sum of vector elements' },
  { label: 'mean', kind: 3, insertText: 'mean(${1:x})', insertTextRules: 4, detail: 'Mean of vector elements' },
  { label: 'max', kind: 3, insertText: 'max(${1:x})', insertTextRules: 4, detail: 'Maximum value' },
  { label: 'min', kind: 3, insertText: 'min(${1:x})', insertTextRules: 4, detail: 'Minimum value' },
  { label: 'round', kind: 3, insertText: 'round(${1:x}, ${2:digits})', insertTextRules: 4, detail: 'Round to n digits' },
  { label: 'sqrt', kind: 3, insertText: 'sqrt(${1:x})', insertTextRules: 4, detail: 'Square root' },
  { label: 'abs', kind: 3, insertText: 'abs(${1:x})', insertTextRules: 4, detail: 'Absolute value' },

  // Variants
  { label: '.Some', kind: 12, insertText: '.Some(${1:value})', insertTextRules: 4, detail: 'Option some variant' },
  { label: '.None', kind: 12, insertText: '.None', detail: 'Option none variant' },
  { label: '.Ok', kind: 12, insertText: '.Ok(${1:value})', insertTextRules: 4, detail: 'Result ok variant' },
  { label: '.Err', kind: 12, insertText: '.Err(${1:error})', insertTextRules: 4, detail: 'Result error variant' },
].map((item, index) => ({
  ...item,
  range: undefined as any,
  sortText: String(index).padStart(4, '0'),
}));

// Register the TypR language with Monaco
export function registerTypRLanguage(monaco: typeof import('monaco-editor')) {
  // Register language
  monaco.languages.register({
    id: TYPR_LANGUAGE_ID,
    extensions: ['.ty'],
    aliases: ['TypR', 'typr'],
    mimetypes: ['text/x-typr'],
  });

  // Set language configuration
  monaco.languages.setLanguageConfiguration(TYPR_LANGUAGE_ID, typrLanguageConfiguration);

  // Set Monarch tokenizer
  monaco.languages.setMonarchTokensProvider(TYPR_LANGUAGE_ID, typrMonarchLanguage);

  // Register completion provider
  monaco.languages.registerCompletionItemProvider(TYPR_LANGUAGE_ID, {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      return {
        suggestions: typrCompletionItems.map(item => ({
          ...item,
          range,
        })),
      };
    },
  });

  // Register hover provider (basic - shows keyword info)
  monaco.languages.registerHoverProvider(TYPR_LANGUAGE_ID, {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const hoverInfo = getHoverInfo(word.word);
      if (!hoverInfo) return null;

      return {
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        },
        contents: [
          { value: `**${hoverInfo.title}**` },
          { value: hoverInfo.description },
        ],
      };
    },
  });
}

// Hover information for keywords and types
function getHoverInfo(word: string): { title: string; description: string } | null {
  const info: Record<string, { title: string; description: string }> = {
    // Keywords
    let: { title: 'let', description: 'Declares a variable binding.\n\n```typr\nlet x: Number = 42\n```' },
    fn: { title: 'fn', description: 'Defines a function.\n\n```typr\nlet add = fn(a: Number, b: Number): Number { a + b }\n```' },
    if: { title: 'if', description: 'Conditional expression.\n\n```typr\nif (condition) { ... } else { ... }\n```' },
    else: { title: 'else', description: 'Alternative branch in conditional.' },
    while: { title: 'while', description: 'Loop while condition is true.\n\n```typr\nwhile (condition) { ... }\n```' },
    for: { title: 'for', description: 'Iterate over a collection.\n\n```typr\nfor (item in collection) { ... }\n```' },
    match: { title: 'match', description: 'Pattern matching expression.\n\n```typr\nmatch value {\n  .Some(x) => x,\n  .None => 0,\n}\n```' },
    return: { title: 'return', description: 'Return a value from a function.' },
    type: { title: 'type', description: 'Define a type alias.\n\n```typr\ntype Point = { x: Number, y: Number }\n```' },
    struct: { title: 'struct', description: 'Define a struct type.' },
    enum: { title: 'enum', description: 'Define an enum type with variants.' },
    impl: { title: 'impl', description: 'Implementation block for a type.' },
    trait: { title: 'trait', description: 'Define a trait (interface).' },
    pub: { title: 'pub', description: 'Make an item publicly visible.' },
    use: { title: 'use', description: 'Import items from a module.' },
    mod: { title: 'mod', description: 'Declare a module.' },

    // Types
    Number: { title: 'Number', description: 'Numeric type (R `numeric`).\n\nRepresents floating-point numbers.' },
    String: { title: 'String', description: 'String type (R `character`).\n\nRepresents text values.' },
    Boolean: { title: 'Boolean', description: 'Boolean type (R `logical`).\n\nEither `TRUE` or `FALSE`.' },
    Integer: { title: 'Integer', description: 'Integer type (R `integer`).\n\nWhole numbers.' },
    Vec: { title: 'Vec<T>', description: 'Vector type.\n\nA homogeneous collection of values.\n\n```typr\nlet nums: Vec<Number> = c(1, 2, 3)\n```' },
    List: { title: 'List<T>', description: 'List type.\n\nA heterogeneous collection.' },
    Option: { title: 'Option<T>', description: 'Optional type.\n\nEither `.Some(value)` or `.None`.\n\n```typr\nlet maybe: Option<Number> = .Some(42)\n```' },
    Result: { title: 'Result<T, E>', description: 'Result type for error handling.\n\nEither `.Ok(value)` or `.Err(error)`.' },
    DataFrame: { title: 'DataFrame', description: 'Data frame type (R `data.frame`).' },
    Matrix: { title: 'Matrix<T>', description: 'Matrix type.\n\n2D array of values.' },
    Any: { title: 'Any', description: 'Any type.\n\nEscape hatch for dynamic typing. Use sparingly.' },
    Unit: { title: 'Unit', description: 'Unit type.\n\nRepresents no value (like `void`).' },

    // Constants
    TRUE: { title: 'TRUE', description: 'Boolean true value.' },
    FALSE: { title: 'FALSE', description: 'Boolean false value.' },
    NULL: { title: 'NULL', description: 'Null value (R `NULL`).' },
    NA: { title: 'NA', description: 'Missing value (R `NA`).' },
    NaN: { title: 'NaN', description: 'Not a Number.' },
    Inf: { title: 'Inf', description: 'Infinity.' },
  };

  return info[word] || null;
}

// Define custom theme tokens for TypR
export function defineTypRTheme(monaco: typeof import('monaco-editor')) {
  // Light theme customizations
  monaco.editor.defineTheme('typr-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c71c3a', fontStyle: 'bold' },
      { token: 'type', foreground: '6f42c1' },
      { token: 'type.parameter', foreground: 'e36209' },
      { token: 'type.variant', foreground: '22863a' },
      { token: 'string', foreground: '032f62' },
      { token: 'string.escape', foreground: '005cc5' },
      { token: 'number', foreground: '005cc5' },
      { token: 'constant', foreground: '005cc5' },
      { token: 'operator', foreground: 'c71c3a' },
      { token: 'entity.name.function', foreground: '6f42c1' },
      { token: 'entity.name.function.external', foreground: 'e36209' },
      { token: 'support.function', foreground: 'c71c3a' },
      { token: 'identifier', foreground: '24292e' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#24292e',
      'editorCursor.foreground': '#c71c3a',
    },
  });

  // Dark theme customizations
  monaco.editor.defineTheme('typr-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c71c3a', fontStyle: 'bold' },
      { token: 'type', foreground: '4ec9b0' },
      { token: 'type.parameter', foreground: 'dcdcaa' },
      { token: 'type.variant', foreground: '4fc1ff' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'string.escape', foreground: 'd7ba7d' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'constant', foreground: '569cd6' },
      { token: 'operator', foreground: 'd4d4d4' },
      { token: 'entity.name.function', foreground: 'dcdcaa' },
      { token: 'entity.name.function.external', foreground: 'dcdcaa', fontStyle: 'italic' },
      { token: 'support.function', foreground: 'c71c3a' },
      { token: 'identifier', foreground: '9cdcfe' },
    ],
    colors: {
      'editor.background': '#232326',
      'editor.foreground': '#d4d4d4',
      'editorCursor.foreground': '#c71c3a',
      'editor.selectionBackground': '#c71c3a33',
      'editor.lineHighlightBackground': '#2a2a2e',
    },
  });
}
