/**
 * MASL - Analizador de Errores Léxicos
 * Detector de Casos Didácticos Sintácticos
 */

class SyntacticHintDetector {
  static inspect(tokens, errors) {
    if (!tokens || tokens.length === 0) return null;

    const tokenTypes = (typeof window !== 'undefined' && window.MASL && window.MASL.TOKEN_TYPES)
      ? window.MASL.TOKEN_TYPES
      : { ERROR: 'ERROR', COMENTARIO: 'COMENTARIO', OPERADOR: 'OPERADOR', DELIMITADOR: 'DELIMITADOR' };

    const validTokens = tokens.filter(t => t.type !== tokenTypes.ERROR && t.type !== tokenTypes.COMENTARIO);
    if (validTokens.length === 0) return null;

    // Detectar dos operadores binarios consecutivos (ej. "20 + * 5;")
    for (let i = 0; i < validTokens.length - 1; i++) {
      const current = validTokens[i];
      const next = validTokens[i + 1];

      if (current.type === tokenTypes.OPERADOR && next.type === tokenTypes.OPERADOR) {
        if (
          (current.lexeme === '+' && next.lexeme === '*') ||
          (current.lexeme === '*' && next.lexeme === '+') ||
          (current.lexeme === '*' && next.lexeme === '/') ||
          (current.lexeme === '/' && next.lexeme === '*') ||
          (current.lexeme === '+' && next.lexeme === '+') ||
          (current.lexeme === '=' && next.lexeme === '=') ||
          (current.lexeme === '-' && next.lexeme === '*')
        ) {
          return {
            detected: true,
            title: 'Diferencia Didáctica: Error Léxico vs. Error Sintáctico',
            tokensInvolved: `"${current.lexeme}" y "${next.lexeme}"`,
            position: `Línea ${current.line}, Columna ${current.column}`,
            message: `La estructura de esta expresión contiene una secuencia anómala (${current.lexeme} ${next.lexeme}) que representa un PROBLEMA SINTÁCTICO, pero eso corresponde a la siguiente fase del compilador.`,
            detailedExplanation: `Observa que el analizador léxico procesó exitosamente "${current.lexeme}" como OPERADOR y "${next.lexeme}" como OPERADOR. Desde el punto de vista léxico, ambos caracteres pertenecen al alfabeto Σ y forman tokens legítimos. Será el Analizador Sintáctico (Parser) quien verifique la gramática libre de contexto (GLC) y rechace esta expresión por carecer de un operando entre ambos operadores.`
          };
        }
      }
    }

    // Detectar delimitadores desbalanceados
    const stack = [];
    const pairs = { '(': ')', '[': ']', '{': '}' };
    let unbalanced = false;

    for (const tok of validTokens) {
      if (tok.type === tokenTypes.DELIMITADOR) {
        if (tok.lexeme in pairs) {
          stack.push({ char: tok.lexeme, line: tok.line, col: tok.column });
        } else if (Object.values(pairs).includes(tok.lexeme)) {
          if (stack.length === 0) {
            unbalanced = true;
            break;
          }
          const last = stack.pop();
          if (pairs[last.char] !== tok.lexeme) {
            unbalanced = true;
            break;
          }
        }
      }
    }

    if (unbalanced || stack.length > 0) {
      return {
        detected: true,
        title: 'Observación Sintáctica: Paréntesis o Llaves Desbalanceadas',
        tokensInvolved: 'Delimitadores de apertura y cierre',
        position: 'Estructura global',
        message: 'Se detecta un posible desbalance en llaves/paréntesis. Esto es competencia del ANÁLISIS SINTÁCTICO mediante un autómata de pila (AP).',
        detailedExplanation: 'El autómata finito del analizador léxico no tiene memoria para contar delimitadores anidados (no puede verificar si cada "(" tiene su ")"). Esta tarea requiere un lenguaje tipo 2 en la Jerarquía de Chomsky y se delega al Parser.'
      };
    }

    return null;
  }
}

if (typeof window !== 'undefined') {
  window.MASL = window.MASL || {};
  window.MASL.SyntacticHintDetector = SyntacticHintDetector;
}
