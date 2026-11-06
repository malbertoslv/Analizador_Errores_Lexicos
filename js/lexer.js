/**
 * MASL - Analizador de Errores Léxicos
 * Motor de Análisis Léxico (Lexer / Escáner manual sin librerías externas)
 */

const getLanguages = () => {
  if (typeof window !== 'undefined' && window.MASL && window.MASL.LANGUAGES) {
    return window.MASL.LANGUAGES;
  }
  return {};
};

const TOKEN_TYPES = {
  PALABRA_RESERVADA: 'PALABRA_RESERVADA',
  IDENTIFICADOR: 'IDENTIFICADOR',
  NUMERO_ENTERO: 'NUMERO_ENTERO',
  NUMERO_DECIMAL: 'NUMERO_DECIMAL',
  NUMERO_HEXADECIMAL: 'NUMERO_HEXADECIMAL',
  CADENA: 'CADENA',
  CARACTER: 'CARACTER',
  OPERADOR: 'OPERADOR',
  DELIMITADOR: 'DELIMITADOR',
  COMENTARIO: 'COMENTARIO',
  DIRECTIVA_PREPROCESADOR: 'DIRECTIVA_PREPROCESADOR',
  ERROR: 'ERROR'
};

const ERROR_TYPES = {
  SIMBOLO_NO_PERMITIDO: 'SIMBOLO_NO_PERMITIDO',
  IDENTIFICADOR_MAL_FORMADO: 'IDENTIFICADOR_MAL_FORMADO',
  NUMERO_MAL_FORMADO: 'NUMERO_MAL_FORMADO',
  CADENA_SIN_CERRAR: 'CADENA_SIN_CERRAR',
  CARACTER_MAL_FORMADO: 'CARACTER_MAL_FORMADO',
  COMENTARIO_SIN_CERRAR: 'COMENTARIO_SIN_CERRAR'
};

class LexicalAnalyzer {
  constructor(sourceCode = '', languageId = 'python') {
    this.source = sourceCode;
    this.languageId = languageId;
    const langs = getLanguages();
    this.lang = langs[languageId] || langs.python || {};

    // Estado del escáner
    this.cursor = 0;
    this.length = this.source.length;
    this.line = 1;
    this.column = 1;

    // Resultados
    this.tokens = [];
    this.errors = [];
    this.steps = [];
  }

  tokenize(recordSteps = false) {
    this.cursor = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];
    this.errors = [];
    this.steps = [];

    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    while (this.cursor < this.length) {
      const char = this.peek();

      // 1. Espacios en blanco y saltos de línea
      if (this.isWhitespace(char)) {
        this.consumeWhitespace(recordSteps);
        continue;
      }

      const startLine = this.line;
      const startCol = this.column;
      const startPos = this.cursor;

      // 2. Directivas de Preprocesador en C (#include, #define...)
      if (this.lang.id === 'c' && char === '#') {
        const consumed = this.scanCPreprocessor(startLine, startCol, startPos, recordSteps);
        if (consumed) continue;
      }

      // 3. Comentarios de línea (# en Python, // en JS y C)
      if (this.isLineCommentStart()) {
        this.scanLineComment(startLine, startCol, startPos, recordSteps);
        continue;
      }

      // 4. Comentarios de bloque (/* ... */ en JS y C)
      if (this.isBlockCommentStart()) {
        this.scanBlockComment(startLine, startCol, startPos, recordSteps);
        continue;
      }

      // 5. Cadenas de caracteres ('...', "...", `...`)
      if (this.isStringQuote(char)) {
        this.scanString(char, startLine, startCol, startPos, recordSteps);
        continue;
      }

      // 6. Literales de carácter en C ('c')
      if (this.lang.id === 'c' && char === "'") {
        this.scanCCharLiteral(startLine, startCol, startPos, recordSteps);
        continue;
      }

      // 7. Números o identificadores mal formados (ej. 9abc)
      if (this.isDigit(char)) {
        this.scanNumberOrMalformedIdentifier(startLine, startCol, startPos, recordSteps);
        continue;
      }

      // 8. Identificadores y Palabras Reservadas
      if (this.lang.identifierStart && this.lang.identifierStart(char)) {
        this.scanIdentifierOrKeyword(startLine, startCol, startPos, recordSteps);
        continue;
      }

      // 9. Operadores multicarácter o de un carácter
      const matchedOperator = this.matchOperator();
      if (matchedOperator) {
        this.advance(matchedOperator.length);
        const token = {
          id: this.tokens.length + 1,
          type: TOKEN_TYPES.OPERADOR,
          lexeme: matchedOperator,
          line: startLine,
          column: startCol,
          start: startPos,
          end: this.cursor
        };
        this.tokens.push(token);

        if (recordSteps) {
          this.recordStep('OPERADOR', token, `Operador reconocido: "${matchedOperator}"`);
        }
        continue;
      }

      // 10. Delimitadores
      if (this.lang.delimiters && this.lang.delimiters.has(char)) {
        this.advance(1);
        const token = {
          id: this.tokens.length + 1,
          type: TOKEN_TYPES.DELIMITADOR,
          lexeme: char,
          line: startLine,
          column: startCol,
          start: startPos,
          end: this.cursor
        };
        this.tokens.push(token);

        if (recordSteps) {
          this.recordStep('DELIMITADOR', token, `Delimitador reconocido: "${char}"`);
        }
        continue;
      }

      // 11. Carácter NO PERTENECIENTE al alfabeto (Error Léxico)
      this.advance(1);
      const invalidLexeme = char;
      const errorObj = {
        id: this.errors.length + 1,
        type: ERROR_TYPES.SIMBOLO_NO_PERMITIDO,
        lexeme: invalidLexeme,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor,
        explanation: this.explainAlphabetError(invalidLexeme)
      };

      this.errors.push(errorObj);
      this.tokens.push({
        id: this.tokens.length + 1,
        type: TOKEN_TYPES.ERROR,
        lexeme: invalidLexeme,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor,
        errorRef: errorObj
      });

      if (recordSteps) {
        this.recordStep('ERROR', errorObj, `Error léxico detectado: símbolo "${invalidLexeme}" fuera del alfabeto.`);
      }
    }

    const endTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const scanTimeMs = +(endTime - startTime).toFixed(2);

    return {
      tokens: this.tokens,
      errors: this.errors,
      stats: this.generateStats(scanTimeMs),
      steps: this.steps
    };
  }

  scanCPreprocessor(startLine, startCol, startPos, recordSteps) {
    this.advance(1); // consume '#'
    
    let directiveName = '';
    while (this.cursor < this.length && /[a-zA-Z]/.test(this.peek())) {
      directiveName += this.peek();
      this.advance(1);
    }

    if (directiveName.length > 0) {
      const fullLexeme = '#' + directiveName;
      const token = {
        id: this.tokens.length + 1,
        type: TOKEN_TYPES.DIRECTIVA_PREPROCESADOR,
        lexeme: fullLexeme,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor
      };
      this.tokens.push(token);

      if (recordSteps) {
        this.recordStep('DIRECTIVA', token, `Directiva del preprocesador C: "${fullLexeme}"`);
      }
      return true;
    }

    const errorObj = {
      id: this.errors.length + 1,
      type: ERROR_TYPES.SIMBOLO_NO_PERMITIDO,
      lexeme: '#',
      line: startLine,
      column: startCol,
      start: startPos,
      end: this.cursor,
      explanation: 'El símbolo "#" en C solo es válido como inicio de directivas de preprocesador (#include, #define).'
    };
    this.errors.push(errorObj);
    this.tokens.push({
      id: this.tokens.length + 1,
      type: TOKEN_TYPES.ERROR,
      lexeme: '#',
      line: startLine,
      column: startCol,
      start: startPos,
      end: this.cursor,
      errorRef: errorObj
    });
    return true;
  }

  isLineCommentStart() {
    if (this.lang.lineCommentStart === '#') {
      return this.peek() === '#';
    }
    if (this.lang.lineCommentStart === '//') {
      return this.peek() === '/' && this.peek(1) === '/';
    }
    return false;
  }

  scanLineComment(startLine, startCol, startPos, recordSteps) {
    let commentText = '';
    const markerLen = this.lang.lineCommentStart ? this.lang.lineCommentStart.length : 1;
    commentText += this.source.slice(this.cursor, this.cursor + markerLen);
    this.advance(markerLen);

    while (this.cursor < this.length && this.peek() !== '\n' && this.peek() !== '\r') {
      commentText += this.peek();
      this.advance(1);
    }

    const token = {
      id: this.tokens.length + 1,
      type: TOKEN_TYPES.COMENTARIO,
      lexeme: commentText,
      line: startLine,
      column: startCol,
      start: startPos,
      end: this.cursor
    };
    this.tokens.push(token);

    if (recordSteps) {
      this.recordStep('COMENTARIO', token, `Comentario de línea: "${commentText.slice(0, 20)}..."`);
    }
  }

  isBlockCommentStart() {
    if (!this.lang.blockComment) return false;
    return this.peek() === '/' && this.peek(1) === '*';
  }

  scanBlockComment(startLine, startCol, startPos, recordSteps) {
    let commentText = '/*';
    this.advance(2);

    let closed = false;
    while (this.cursor < this.length) {
      if (this.peek() === '*' && this.peek(1) === '/') {
        commentText += '*/';
        this.advance(2);
        closed = true;
        break;
      }
      commentText += this.peek();
      this.advance(1);
    }

    if (closed) {
      const token = {
        id: this.tokens.length + 1,
        type: TOKEN_TYPES.COMENTARIO,
        lexeme: commentText,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor
      };
      this.tokens.push(token);

      if (recordSteps) {
        this.recordStep('COMENTARIO', token, `Comentario de bloque cerrado correctamente`);
      }
    } else {
      const errorObj = {
        id: this.errors.length + 1,
        type: ERROR_TYPES.COMENTARIO_SIN_CERRAR,
        lexeme: commentText,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor,
        explanation: 'Comentario de bloque no cerrado. Se esperaba el delimitador de cierre "*/" antes del fin de archivo.'
      };
      this.errors.push(errorObj);
      this.tokens.push({
        id: this.tokens.length + 1,
        type: TOKEN_TYPES.ERROR,
        lexeme: commentText,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor,
        errorRef: errorObj
      });

      if (recordSteps) {
        this.recordStep('ERROR', errorObj, `Error léxico: comentario de bloque sin cerrar.`);
      }
    }
  }

  isStringQuote(char) {
    if (this.lang.id === 'c' && char === "'") {
      return false;
    }
    return this.lang.stringQuotes && this.lang.stringQuotes.includes(char);
  }

  scanString(quoteChar, startLine, startCol, startPos, recordSteps) {
    const isTriple = this.lang.supportsTripleQuotes &&
      this.peek(1) === quoteChar &&
      this.peek(2) === quoteChar;

    let stringText = quoteChar;
    this.advance(1);

    if (isTriple) {
      stringText += quoteChar + quoteChar;
      this.advance(2);
    }

    let closed = false;

    while (this.cursor < this.length) {
      const c = this.peek();

      if (!isTriple && quoteChar !== '`' && (c === '\n' || c === '\r')) {
        break;
      }

      if (c === '\\' && this.cursor + 1 < this.length) {
        stringText += c + this.peek(1);
        this.advance(2);
        continue;
      }

      if (isTriple) {
        if (c === quoteChar && this.peek(1) === quoteChar && this.peek(2) === quoteChar) {
          stringText += quoteChar + quoteChar + quoteChar;
          this.advance(3);
          closed = true;
          break;
        }
      } else {
        if (c === quoteChar) {
          stringText += quoteChar;
          this.advance(1);
          closed = true;
          break;
        }
      }

      stringText += c;
      this.advance(1);
    }

    if (closed) {
      const token = {
        id: this.tokens.length + 1,
        type: TOKEN_TYPES.CADENA,
        lexeme: stringText,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor
      };
      this.tokens.push(token);

      if (recordSteps) {
        this.recordStep('CADENA', token, `Cadena literal: ${stringText.slice(0, 15)}...`);
      }
    } else {
      const errorObj = {
        id: this.errors.length + 1,
        type: ERROR_TYPES.CADENA_SIN_CERRAR,
        lexeme: stringText,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor,
        explanation: `Cadena literal sin cerrar. Se esperaba delimitador "${quoteChar}". Una cadena no puede quedar abierta al final de línea o archivo.`
      };
      this.errors.push(errorObj);
      this.tokens.push({
        id: this.tokens.length + 1,
        type: TOKEN_TYPES.ERROR,
        lexeme: stringText,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor,
        errorRef: errorObj
      });

      if (recordSteps) {
        this.recordStep('ERROR', errorObj, `Error léxico: cadena sin cerrar.`);
      }
    }
  }

  scanCCharLiteral(startLine, startCol, startPos, recordSteps) {
    let charText = "'";
    this.advance(1);

    let closed = false;
    let contentChars = 0;

    while (this.cursor < this.length && this.peek() !== '\n' && this.peek() !== '\r') {
      const c = this.peek();

      if (c === '\\' && this.cursor + 1 < this.length) {
        charText += c + this.peek(1);
        this.advance(2);
        contentChars++;
        continue;
      }

      if (c === "'") {
        charText += "'";
        this.advance(1);
        closed = true;
        break;
      }

      charText += c;
      this.advance(1);
      contentChars++;
    }

    if (closed && contentChars === 1) {
      const token = {
        id: this.tokens.length + 1,
        type: TOKEN_TYPES.CARACTER,
        lexeme: charText,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor
      };
      this.tokens.push(token);

      if (recordSteps) {
        this.recordStep('CARACTER', token, `Carácter literal válido en C: "${charText}"`);
      }
    } else {
      let explanation = 'Literal de carácter mal formado en C.';
      if (!closed) {
        explanation = 'Literal de carácter sin cerrar. Se esperaba comilla simple de cierre (\').';
      } else if (contentChars === 0) {
        explanation = 'El literal de carácter no puede estar vacío (\'\').';
      } else {
        explanation = `Un literal 'char' en C solo puede contener 1 carácter (se encontraron ${contentChars}). Use comillas dobles para cadenas.`;
      }

      const errorObj = {
        id: this.errors.length + 1,
        type: ERROR_TYPES.CARACTER_MAL_FORMADO,
        lexeme: charText,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor,
        explanation
      };
      this.errors.push(errorObj);
      this.tokens.push({
        id: this.tokens.length + 1,
        type: TOKEN_TYPES.ERROR,
        lexeme: charText,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor,
        errorRef: errorObj
      });
    }
  }

  scanNumberOrMalformedIdentifier(startLine, startCol, startPos, recordSteps) {
    let lexeme = '';

    // Hexadecimal (0x / 0X)
    if (this.peek() === '0' && (this.peek(1) === 'x' || this.peek(1) === 'X')) {
      lexeme += this.peek() + this.peek(1);
      this.advance(2);

      let hexDigits = '';
      while (this.cursor < this.length && /[0-9a-fA-F]/.test(this.peek())) {
        hexDigits += this.peek();
        this.advance(1);
      }
      lexeme += hexDigits;

      let invalidFollowers = '';
      while (this.cursor < this.length && this.lang.identifierPart && this.lang.identifierPart(this.peek())) {
        invalidFollowers += this.peek();
        this.advance(1);
      }

      if (hexDigits.length === 0 || invalidFollowers.length > 0) {
        lexeme += invalidFollowers;
        const errorObj = {
          id: this.errors.length + 1,
          type: ERROR_TYPES.NUMERO_MAL_FORMADO,
          lexeme,
          line: startLine,
          column: startCol,
          start: startPos,
          end: this.cursor,
          explanation: `Número hexadecimal mal formado "${lexeme}". Se esperaba al menos un dígito hexadecimal válido (0-9, A-F) después del prefijo "0x".`
        };
        this.errors.push(errorObj);
        this.tokens.push({
          id: this.tokens.length + 1,
          type: TOKEN_TYPES.ERROR,
          lexeme,
          line: startLine,
          column: startCol,
          start: startPos,
          end: this.cursor,
          errorRef: errorObj
        });
        return;
      }

      const token = {
        id: this.tokens.length + 1,
        type: TOKEN_TYPES.NUMERO_HEXADECIMAL,
        lexeme,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor
      };
      this.tokens.push(token);
      return;
    }

    // Dígitos enteros
    while (this.cursor < this.length && this.isDigit(this.peek())) {
      lexeme += this.peek();
      this.advance(1);
    }

    let isDecimal = false;
    let dotCount = 0;

    while (this.cursor < this.length && this.peek() === '.') {
      dotCount++;
      lexeme += '.';
      this.advance(1);

      let hasDecDigits = false;
      while (this.cursor < this.length && this.isDigit(this.peek())) {
        lexeme += this.peek();
        this.advance(1);
        hasDecDigits = true;
      }
      if (hasDecDigits) {
        isDecimal = true;
      }
    }

    let hasExponent = false;
    let malformedExponent = false;
    if (this.cursor < this.length && (this.peek() === 'e' || this.peek() === 'E')) {
      hasExponent = true;
      lexeme += this.peek();
      this.advance(1);

      if (this.cursor < this.length && (this.peek() === '+' || this.peek() === '-')) {
        lexeme += this.peek();
        this.advance(1);
      }

      let expDigits = 0;
      while (this.cursor < this.length && this.isDigit(this.peek())) {
        lexeme += this.peek();
        this.advance(1);
        expDigits++;
      }

      if (expDigits === 0) {
        malformedExponent = true;
      }
    }

    let validCSuffix = false;
    if (this.lang.id === 'c') {
      const restChars = this.peekWord();
      if (/^(f|F|l|L|u|U|ul|UL|ll|LL|ull|ULL)$/.test(restChars)) {
        lexeme += restChars;
        this.advance(restChars.length);
        validCSuffix = true;
      }
    }

    let lettersAfter = '';
    while (this.cursor < this.length && this.lang.identifierPart && this.lang.identifierPart(this.peek())) {
      lettersAfter += this.peek();
      this.advance(1);
    }

    // ERROR A: Identificador mal formado que inicia con dígito (ej. 9abc)
    if (lettersAfter.length > 0 && !validCSuffix) {
      lexeme += lettersAfter;
      const errorObj = {
        id: this.errors.length + 1,
        type: ERROR_TYPES.IDENTIFICADOR_MAL_FORMADO,
        lexeme,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor,
        explanation: `Identificador mal formado "${lexeme}". En ${this.lang.name || 'el lenguaje'}, los identificadores deben iniciar con una letra o guion bajo, nunca con un dígito.`
      };
      this.errors.push(errorObj);
      this.tokens.push({
        id: this.tokens.length + 1,
        type: TOKEN_TYPES.ERROR,
        lexeme,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor,
        errorRef: errorObj
      });
      return;
    }

    // ERROR B: Múltiples puntos decimales (ej. 3.14.15)
    if (dotCount > 1) {
      const errorObj = {
        id: this.errors.length + 1,
        type: ERROR_TYPES.NUMERO_MAL_FORMADO,
        lexeme,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor,
        explanation: `Número mal formado "${lexeme}". Un número decimal solo puede contener un único punto separador (se encontraron ${dotCount} puntos).`
      };
      this.errors.push(errorObj);
      this.tokens.push({
        id: this.tokens.length + 1,
        type: TOKEN_TYPES.ERROR,
        lexeme,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor,
        errorRef: errorObj
      });
      return;
    }

    // ERROR C: Exponente sin dígitos (ej. 1e)
    if (malformedExponent) {
      const errorObj = {
        id: this.errors.length + 1,
        type: ERROR_TYPES.NUMERO_MAL_FORMADO,
        lexeme,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor,
        explanation: `Número con exponente incompleto "${lexeme}". Requiere dígitos tras el exponente.`
      };
      this.errors.push(errorObj);
      this.tokens.push({
        id: this.tokens.length + 1,
        type: TOKEN_TYPES.ERROR,
        lexeme,
        line: startLine,
        column: startCol,
        start: startPos,
        end: this.cursor,
        errorRef: errorObj
      });
      return;
    }

    // Número Válido
    const tokenType = (isDecimal || hasExponent) ? TOKEN_TYPES.NUMERO_DECIMAL : TOKEN_TYPES.NUMERO_ENTERO;
    const token = {
      id: this.tokens.length + 1,
      type: tokenType,
      lexeme,
      line: startLine,
      column: startCol,
      start: startPos,
      end: this.cursor
    };
    this.tokens.push(token);

    if (recordSteps) {
      this.recordStep(tokenType, token, `Número reconocido: "${lexeme}"`);
    }
  }

  scanIdentifierOrKeyword(startLine, startCol, startPos, recordSteps) {
    let word = '';

    while (this.cursor < this.length && this.lang.identifierPart && this.lang.identifierPart(this.peek())) {
      word += this.peek();
      this.advance(1);
    }

    const isKeyword = this.lang.keywords ? this.lang.keywords.has(word) : false;
    const tokenType = isKeyword ? TOKEN_TYPES.PALABRA_RESERVADA : TOKEN_TYPES.IDENTIFICADOR;

    const token = {
      id: this.tokens.length + 1,
      type: tokenType,
      lexeme: word,
      line: startLine,
      column: startCol,
      start: startPos,
      end: this.cursor
    };
    this.tokens.push(token);

    if (recordSteps) {
      this.recordStep(tokenType, token, `${isKeyword ? 'Palabra reservada' : 'Identificador'}: "${word}"`);
    }
  }

  matchOperator() {
    if (!this.lang.operators) return null;
    for (const op of this.lang.operators) {
      if (this.source.startsWith(op, this.cursor)) {
        return op;
      }
    }
    return null;
  }

  explainAlphabetError(symbol) {
    if (this.lang.id === 'python' && symbol === '@') {
      return 'El símbolo "@" no forma parte del alfabeto léxico definido para esta especificación de Autómatas I (no se contemplan decoradores). Es un símbolo fuera del alfabeto Σ.';
    }
    if (this.lang.id === 'c' && symbol === '$') {
      return 'En lenguaje C (ANSI / C99), el símbolo "$" NO es un carácter válido para nombres de identificadores ni pertenece a sus operadores o delimitadores.';
    }
    if (symbol === '¿' || symbol === '¡') {
      return `Los caracteres de apertura de interrogación o exclamación ("${symbol}") no pertenecen al alfabeto estándar del lenguaje ${this.lang.name || ''}.`;
    }
    return `El carácter "${symbol}" (código Unicode U+${symbol.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}) no pertenece al alfabeto de entrada Σ definido para el lenguaje ${this.lang.name || ''}.`;
  }

  peek(offset = 0) {
    const idx = this.cursor + offset;
    return idx < this.length ? this.source[idx] : '\0';
  }

  peekWord() {
    let word = '';
    let idx = this.cursor;
    while (idx < this.length && /[a-zA-Z]/.test(this.source[idx])) {
      word += this.source[idx];
      idx++;
    }
    return word;
  }

  advance(step = 1) {
    for (let i = 0; i < step; i++) {
      if (this.cursor >= this.length) break;
      const char = this.source[this.cursor];
      this.cursor++;

      if (char === '\n') {
        this.line++;
        this.column = 1;
      } else if (char === '\r') {
        if (this.peek() !== '\n') {
          this.line++;
          this.column = 1;
        }
      } else {
        this.column++;
      }
    }
  }

  isWhitespace(char) {
    return char === ' ' || char === '\t' || char === '\n' || char === '\r';
  }

  consumeWhitespace(recordSteps) {
    while (this.cursor < this.length && this.isWhitespace(this.peek())) {
      this.advance(1);
    }
  }

  isDigit(char) {
    return char >= '0' && char <= '9';
  }

  recordStep(stateName, item, message) {
    this.steps.push({
      stepNumber: this.steps.length + 1,
      cursor: this.cursor,
      line: this.line,
      column: this.column,
      stateName,
      lexeme: item.lexeme,
      type: item.type,
      message
    });
  }

  generateStats(scanTimeMs) {
    const counts = {};
    for (const type of Object.values(TOKEN_TYPES)) {
      if (type !== TOKEN_TYPES.ERROR) {
        counts[type] = 0;
      }
    }

    let validTokenCount = 0;
    for (const token of this.tokens) {
      if (token.type !== TOKEN_TYPES.ERROR) {
        counts[token.type] = (counts[token.type] || 0) + 1;
        validTokenCount++;
      }
    }

    const linesCount = this.source.split(/\r\n|\r|\n/).length;

    return {
      scanTimeMs,
      totalTokens: validTokenCount,
      totalErrors: this.errors.length,
      linesCount,
      charsCount: this.length,
      counts
    };
  }
}

if (typeof window !== 'undefined') {
  window.MASL = window.MASL || {};
  window.MASL.TOKEN_TYPES = TOKEN_TYPES;
  window.MASL.ERROR_TYPES = ERROR_TYPES;
  window.MASL.LexicalAnalyzer = LexicalAnalyzer;
}
