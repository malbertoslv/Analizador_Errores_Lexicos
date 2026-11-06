# MASL – Analizador de Errores Léxicos
### Herramienta Didáctica e Interactiva para la materia **Autómatas I**

**MASL** (Mini Analizador Sintáctico y Léxico - Fase Léxica) es una aplicación web interactiva de alto rendimiento desarrollada sin dependencias ni librerías externas de parsing. Simula fielmente la primera fase de un compilador: el **Análisis Léxico (Scanning)**.

---

## 🚀 Cómo Ejecutar la Aplicación

No requiere Node.js, Python ni compilación previa. Todo se ejecuta 100% del lado del cliente en el navegador.

1. **Opción 1 (Directa):**
   Haz doble clic sobre el archivo `index.html` en el explorador de archivos. Se abrirá directamente en Google Chrome, Microsoft Edge, Firefox, Brave o Safari.

2. **Opción 2 (Servidor Local opcional):**
   Si cuentas con una extensión como *Live Server* en VS Code o cualquier servidor estático:
   ```bash
   npx serve .
   # o en Python:
   python -m http.server 8000
   ```

---

## 📂 Estructura del Proyecto

```text
masl-analizador-lexico/
│
├── index.html                 # Estructura semántica, accesibilidad y modales
├── README.md                  # Documentación teórica y de uso
│
├── css/
│   └── styles.css             # Estilos modernos, Dark/Light mode, Glassmorphism y temas
│
└── js/
    ├── languages.js           # Definiciones formales del alfabeto y tokens (Python, JS, C)
    ├── lexer.js               # Motor del autómata léxico (AFD carácter por carácter)
    ├── syntactic-hints.js     # Detector didáctico de anomalías sintácticas (ej. 20 + * 5;)
    ├── examples.js            # Catálogo de ejemplos predefinidos por lenguaje
    ├── test-suite.js          # Banco automatizado de 12 pruebas de validación formal
    ├── step-simulator.js      # Controlador de simulación paso a paso con HUD de estados
    ├── editor.js              # Editor interactivo con sincronización de gutter y subrayado ondulado
    └── app.js                 # Controlador principal de interfaz y eventos
```

---

## 🧠 Criterios y Reglas de Pertenencia al Lenguaje

El analizador toma decisiones formales basadas en la **Teoría de Autómatas y Lenguajes Formales (Jerarquía de Chomsky - Tipo 3)**:

### 1. Alfabeto de Entrada ($\Sigma$)
Cada lenguaje posee un conjunto formal de caracteres válidos:
- **Python (Simplificado para Autómatas I):** $\Sigma = \{a..z, A..Z, 0..9, \_, +, -, *, /, \%, =, <, >, !, (, ), [, ], \{, \}, ,, :, ;, ., \#, ', "\}$. El carácter `@` está explícitamente fuera de este alfabeto simplificado (marcado como error léxico `SIMBOLO_NO_PERMITIDO`).
- **JavaScript:** $\Sigma$ incluye el símbolo de dólar `$` como carácter válido para identificadores. Símbolos como `@`, `#` (fuera de campos privados) o `¿`, `¡` son clasificados como no pertenecientes al alfabeto.
- **C (ANSI / C99):** El símbolo `$` **NO** es válido para nombres de variables en C estándar. Si el escáner encuentra `$precio`, reporta un error léxico de símbolo prohibido.

### 2. Reglas de Formación de Tokens

| Categoría | Regla Formal / Expresión Regular | Posibles Errores Léxicos |
|---|---|---|
| **Identificadores** | `[a-zA-Z_][a-zA-Z0-9_]*` (o con `$` en JS) | `9variable`, `8items`: Identificador mal formado (no puede iniciar con un dígito). |
| **Números Enteros** | `[0-9]+` | `12abc`: Dígitos seguidos de identificador no reconocido. |
| **Números Decimales** | `[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?` | `3.14.15`: Múltiples puntos decimales.<br>`1e`: Exponente científico sin dígitos. |
| **Números Hexadecimales** | `0[xX][0-9a-fA-F]+` | `0xZZ`: Prefijo 0x sin dígitos hexadecimales válidos. |
| **Cadenas Literales** | `"[^"\\]*"` o `'[^'\\]*'` | Cadena sin comilla de cierre antes del fin de línea/archivo. |
| **Comentarios de Bloque** | `/\*([^*]\|\*+[^*/])*\*+/` | `/*` que llega al fin de archivo (EOF) sin `*/`. |

### 3. Recuperación de Errores (Error Recovery)
El analizador **nunca se detiene ante el primer error**. Registra el símbolo o lexema inválido con su número exacto de línea y columna, avanza el cabezal de lectura y continúa analizando el resto del código para reportar todos los errores encontrados.

---

## ⚖️ Distinción Didáctica Crucial: Error Léxico vs. Error Sintáctico

Un aspecto fundamental enseñado en **Autómatas I** es que el análisis léxico **no verifica gramática**:

* Caso **`x = 5 @ 3`**:
  * Es un **ERROR LÉXICO**, porque el carácter `@` no pertenece al alfabeto $\Sigma$ del lenguaje configurado.
* Caso **`20 + * 5;`**:
  * **NO contiene errores léxicos**.
  * Cada token por separado es 100% válido:
    1. `20` $\rightarrow$ `NUMERO_ENTERO`
    2. `+` $\rightarrow$ `OPERADOR`
    3. `*` $\rightarrow$ `OPERADOR`
    4. `5` $\rightarrow$ `NUMERO_ENTERO`
    5. `;` $\rightarrow$ `DELIMITADOR`
  * La aplicación emite el veredicto **"✅ Sin errores léxicos"** y muestra la nota didáctica:
    > *"La estructura de esta expresión podría ser un problema sintáctico, pero eso corresponde a la siguiente fase del compilador (Parser)."*

---

## 🛠️ Cómo Agregar Nuevos Lenguajes

Gracias a la arquitectura basada en configuración de `js/languages.js`, para añadir un nuevo lenguaje (por ejemplo, Java, Rust o Go) solo debes agregar una nueva clave al objeto `LANGUAGES`:

```javascript
LANGUAGES.java = {
  id: 'java',
  name: 'Java',
  icon: '☕',
  versionNote: 'Java SE estándar',
  alphabetDescription: 'Letras, dígitos, _, $, operadores estándar...',
  keywords: new Set(['public', 'class', 'static', 'void', 'main', 'int', ...]),
  operators: ['==', '!=', '<=', '>=', '&&', '||', '+', '-', '*', '/', ...],
  delimiters: new Set(['(', ')', '{', '}', '[', ']', ';', ',', '.']),
  identifierStart: (char) => /[a-zA-Z_$]/.test(char),
  identifierPart: (char) => /[a-zA-Z0-9_$]/.test(char),
  stringQuotes: ['"'],
  charQuotes: ["'"],
  lineCommentStart: '//',
  blockComment: { start: '/*', end: '*/' },
  explicitForbiddenSymbols: new Set(['@', '`', '¿', '¡']),
  educationalNotes: [...]
};
```
La interfaz generará automáticamente las pestañas, filtros y reglas correspondientes.
