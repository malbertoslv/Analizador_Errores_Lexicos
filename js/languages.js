/**
 * MASL - Analizador de Errores Léxicos
 * Definición de Lenguajes y Reglas Léxicas (Configuración extensible)
 */

const LANGUAGES = {
  python: {
    id: 'python',
    name: 'Python',
    icon: '🐍',
    versionNote: 'Versión simplificada para Autómatas I (no incluye decoradores con @)',
    alphabetDescription: 'Letras (a-z, A-Z), Dígitos (0-9), Guion bajo (_), Operadores estándar, Delimitadores matemáticos y de bloque. Símbolos como @, $, ?, ` están fuera del alfabeto.',
    
    keywords: new Set([
      'if', 'elif', 'else', 'while', 'for', 'in', 'def', 'return',
      'class', 'import', 'from', 'as', 'True', 'False', 'None',
      'and', 'or', 'not', 'break', 'continue', 'pass', 'try',
      'except', 'finally', 'with', 'lambda', 'yield', 'global',
      'nonlocal', 'raise', 'assert', 'is'
    ]),

    operators: [
      '//=', '**=',
      '//', '**', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=',
      '+', '-', '*', '/', '%', '=', '<', '>', '&', '|', '^', '~'
    ],

    delimiters: new Set(['(', ')', '[', ']', '{', '}', ',', ':', ';', '.']),

    identifierStart: (char) => /[a-zA-Z_]/.test(char),
    identifierPart: (char) => /[a-zA-Z0-9_]/.test(char),

    stringQuotes: ["'", '"'],
    supportsTripleQuotes: true,
    supportsEscapeChars: true,

    lineCommentStart: '#',
    blockComment: null,

    preprocessorDirectives: null,

    explicitForbiddenSymbols: new Set(['@', '$', '?', '`', '¿', '¡', '\\']),

    educationalNotes: [
      'En Python estándar, el símbolo @ se usa para decoradores. Sin embargo, en la especificación simplificada de este curso de Autómatas I, @ está catalogado fuera del alfabeto léxico básico.',
      'Los identificadores NUNCA pueden comenzar con un dígito (ej. 9variable es un error léxico).',
      'Los números flotantes admiten un único punto decimal. Expresiones como 3.14.15 son errores léxicos de número mal formado.',
      'Las cadenas deben cerrarse en la misma línea a menos que usen comillas triples.'
    ]
  },

  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    icon: '⚡',
    versionNote: 'JavaScript ES6+ simplificado para Autómatas I',
    alphabetDescription: 'Letras (a-z, A-Z), Dígitos (0-9), Guion bajo (_), Símbolo de dólar ($), Operadores aritméticos, lógicos y relacionales, Delimitadores. Símbolos como @, #, ¿, ¡ están fuera del alfabeto válido.',

    keywords: new Set([
      'let', 'const', 'var', 'function', 'return', 'if', 'else',
      'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'new', 'this', 'class', 'true', 'false', 'null', 'undefined',
      'typeof', 'import', 'export', 'default', 'extends', 'super',
      'try', 'catch', 'finally', 'throw', 'async', 'await', 'instanceof'
    ]),

    operators: [
      '===', '!==', '>>>', '>>=', '<<=',
      '==', '!=', '<=', '>=', '&&', '||', '++', '--', '=>',
      '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>',
      '+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~'
    ],

    delimiters: new Set(['(', ')', '[', ']', '{', '}', ',', ';', ':', '.']),

    identifierStart: (char) => /[a-zA-Z_$]/.test(char),
    identifierPart: (char) => /[a-zA-Z0-9_$]/.test(char),

    stringQuotes: ["'", '"', '`'],
    supportsTripleQuotes: false,
    supportsEscapeChars: true,

    lineCommentStart: '//',
    blockComment: { start: '/*', end: '*/' },

    preprocessorDirectives: null,

    explicitForbiddenSymbols: new Set(['@', '#', '¿', '¡', '\\']),

    educationalNotes: [
      'En JavaScript, el símbolo $ SÍ es un carácter válido para identificadores (ej. $total o jQuery).',
      'Soporta números hexadecimales que inician con 0x o 0X (ej. 0xFF). Si no incluye dígitos tras 0x, es un error léxico.',
      'Soporta cadenas con comillas simples, dobles y plantillas con acento grave (`template string`). Si alguna no se cierra antes del fin de archivo, es error léxico.',
      'Los comentarios de bloque /* ... */ deben cerrarse obligatoriamente con */.'
    ]
  },

  c: {
    id: 'c',
    name: 'C (ANSI / C99)',
    icon: '⚙️',
    versionNote: 'Lenguaje C estándar para Autómatas I',
    alphabetDescription: 'Letras (a-z, A-Z), Dígitos (0-9), Guion bajo (_), Directivas con #, Operadores de puntero y aritméticos. El símbolo $ NO está permitido en identificadores de C.',

    keywords: new Set([
      'int', 'float', 'double', 'char', 'void', 'if', 'else',
      'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'return', 'struct', 'typedef', 'const', 'static', 'sizeof',
      'long', 'short', 'signed', 'unsigned', 'enum', 'union',
      'auto', 'register', 'extern', 'goto', 'default', 'volatile'
    ]),

    operators: [
      '->', '==', '!=', '<=', '>=', '&&', '||', '++', '--',
      '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>',
      '+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~'
    ],

    delimiters: new Set(['(', ')', '[', ']', '{', '}', ',', ';', ':']),

    identifierStart: (char) => /[a-zA-Z_]/.test(char),
    identifierPart: (char) => /[a-zA-Z0-9_]/.test(char),

    stringQuotes: ['"'],
    charQuotes: ["'"],
    supportsTripleQuotes: false,
    supportsEscapeChars: true,

    lineCommentStart: '//',
    blockComment: { start: '/*', end: '*/' },

    preprocessorKeywords: new Set([
      'include', 'define', 'undef', 'ifdef', 'ifndef',
      'if', 'else', 'elif', 'endif', 'error', 'pragma'
    ]),

    explicitForbiddenSymbols: new Set(['@', '$', '`', '¿', '¡', '\\']),

    educationalNotes: [
      'A diferencia de JavaScript, en C el símbolo $ NO es parte del alfabeto de identificadores. Usar $variable genera un error léxico.',
      'Las directivas del preprocesador inician con # (ej. #include <stdio.h>, #define PI 3.14). Se clasifican como tokens especiales del preprocesador.',
      'C distingue entre literales de caracteres delimitados con comillas simples (\'a\') y cadenas de caracteres con comillas dobles ("hola").',
      'Los sufijos numéricos como 10L (long), 3.5f (float) o 100U (unsigned) son válidos en C. Sin embargo, números seguidos de letras no reconocidas (ej. 12abc) son errores léxicos.'
    ]
  }
};

if (typeof window !== 'undefined') {
  window.MASL = window.MASL || {};
  window.MASL.LANGUAGES = LANGUAGES;
}
