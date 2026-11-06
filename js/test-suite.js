/**
 * MASL - Analizador de Errores Léxicos
 * Banco de Pruebas Automatizado (Test Suite Integrado)
 */

const getDeps = () => {
  if (typeof window !== 'undefined' && window.MASL) {
    return {
      LexicalAnalyzer: window.MASL.LexicalAnalyzer,
      TOKEN_TYPES: window.MASL.TOKEN_TYPES,
      ERROR_TYPES: window.MASL.ERROR_TYPES,
      SyntacticHintDetector: window.MASL.SyntacticHintDetector
    };
  }
  return {};
};

const TEST_CASES = [
  {
    id: 'test-1-python-at',
    name: 'Criterio 1: Detección de símbolo @ en Python',
    language: 'python',
    code: 'x = 5 @ 3',
    assertion: (result, deps) => {
      const hasError = result.errors.length === 1;
      const atError = result.errors.find(e => e.lexeme === '@');
      const isCol7 = atError && atError.column === 7;
      return {
        passed: hasError && !!atError && isCol7,
        expected: '1 error léxico en símbolo "@" (Línea 1, Col 7)',
        actual: `${result.errors.length} errores. Símbolo: "${atError?.lexeme || 'ninguno'}" en Col ${atError?.column || 'N/A'}`
      };
    }
  },
  {
    id: 'test-2-syntactic-case-py',
    name: 'Criterio 2: "20 + * 5;" en Python (Sin error léxico + Aviso sintáctico)',
    language: 'python',
    code: '20 + * 5;',
    assertion: (result, deps) => {
      const hintDetector = deps.SyntacticHintDetector || (typeof window !== 'undefined' && window.MASL && window.MASL.SyntacticHintDetector);
      const hint = hintDetector ? hintDetector.inspect(result.tokens, result.errors) : null;
      const zeroErrors = result.errors.length === 0;
      const hintActive = hint && hint.detected;
      return {
        passed: zeroErrors && hintActive,
        expected: '0 errores léxicos + Detección de aviso sintáctico para "+ *"',
        actual: `${result.errors.length} errores léxicos. Aviso sintáctico detectado: ${hintActive ? 'SÍ' : 'NO'}`
      };
    }
  },
  {
    id: 'test-3-malformed-id-py',
    name: 'Criterio 3: "9abc = 1" identificador mal formado',
    language: 'python',
    code: '9abc = 1',
    assertion: (result, deps) => {
      const err = result.errors.find(e => e.lexeme === '9abc');
      const passed = result.errors.length === 1 && !!err;
      return {
        passed,
        expected: '1 error IDENTIFICADOR_MAL_FORMADO con lexema "9abc"',
        actual: `${result.errors.length} errores. Lexema: "${err?.lexeme || 'ninguno'}"`
      };
    }
  },
  {
    id: 'test-4-unclosed-str-py',
    name: 'Criterio 4: Cadena sin cerrar en Python',
    language: 'python',
    code: 'print("hola',
    assertion: (result, deps) => {
      const err = result.errors.find(e => e.type === 'CADENA_SIN_CERRAR');
      const passed = result.errors.length === 1 && !!err;
      return {
        passed,
        expected: '1 error CADENA_SIN_CERRAR',
        actual: `${result.errors.length} errores. Error detectado: ${err?.type || 'ninguno'}`
      };
    }
  },
  {
    id: 'test-5-malformed-float-py',
    name: 'Criterio 5: Número con múltiples puntos "3.14.15"',
    language: 'python',
    code: 'valor = 3.14.15',
    assertion: (result, deps) => {
      const err = result.errors.find(e => e.lexeme === '3.14.15');
      const passed = result.errors.length === 1 && !!err;
      return {
        passed,
        expected: '1 error NUMERO_MAL_FORMADO en "3.14.15"',
        actual: `${result.errors.length} errores. Lexema: "${err?.lexeme || 'ninguno'}"`
      };
    }
  },
  {
    id: 'test-6-valid-code-py',
    name: 'Criterio 6: Código válido en Python con 0 errores',
    language: 'python',
    code: 'def sumar(a, b):\n    return a + b\ntotal = sumar(10, 20)',
    assertion: (result, deps) => {
      const passed = result.errors.length === 0 && result.tokens.length > 10;
      return {
        passed,
        expected: '0 errores léxicos y clasificación de todos los tokens',
        actual: `${result.errors.length} errores, ${result.tokens.length} tokens clasificados`
      };
    }
  },
  {
    id: 'test-7-js-dollar-valid',
    name: 'Criterio 7: $ es identificador VÁLIDO en JavaScript',
    language: 'javascript',
    code: 'let $variable = 100;\nconst total = $variable * 2;',
    assertion: (result, deps) => {
      const passed = result.errors.length === 0;
      const dollarToken = result.tokens.find(t => t.lexeme === '$variable');
      const isId = dollarToken && dollarToken.type === 'IDENTIFICADOR';
      return {
        passed: passed && isId,
        expected: '0 errores léxicos. "$variable" catalogado como IDENTIFICADOR',
        actual: `${result.errors.length} errores. Token "$variable": ${dollarToken?.type || 'No hallado'}`
      };
    }
  },
  {
    id: 'test-8-c-dollar-invalid',
    name: 'Criterio 8: $ es SÍMBOLO PROHIBIDO en C',
    language: 'c',
    code: 'int $precio = 50;',
    assertion: (result, deps) => {
      const err = result.errors.find(e => e.lexeme === '$');
      const passed = result.errors.length === 1 && !!err;
      return {
        passed,
        expected: '1 error léxico en símbolo "$" (C no admite $ en variables)',
        actual: `${result.errors.length} errores. Símbolo detectado: "${err?.lexeme || 'ninguno'}"`
      };
    }
  },
  {
    id: 'test-9-js-hex-valid-and-invalid',
    name: 'Criterio 9: Detección de Hexadecimal mal formado en JS (0xZZ)',
    language: 'javascript',
    code: 'let valido = 0xFF;\nlet invalido = 0xZZ;',
    assertion: (result, deps) => {
      const hexToken = result.tokens.find(t => t.lexeme === '0xFF');
      const hexError = result.errors.find(e => e.lexeme === '0xZZ');
      const passed = hexToken?.type === 'NUMERO_HEXADECIMAL' && !!hexError;
      return {
        passed,
        expected: '0xFF válido como NUMERO_HEXADECIMAL y 0xZZ marcado como NUMERO_MAL_FORMADO',
        actual: `0xFF: ${hexToken?.type || 'No reconocido'}, 0xZZ: ${hexError?.type || 'No reportado'}`
      };
    }
  },
  {
    id: 'test-10-c-preprocessor-valid',
    name: 'Criterio 10: Directiva del Preprocesador #include en C',
    language: 'c',
    code: '#include <stdio.h>\nint x = 10;',
    assertion: (result, deps) => {
      const prepToken = result.tokens.find(t => t.lexeme === '#include');
      const passed = result.errors.length === 0 && prepToken?.type === 'DIRECTIVA_PREPROCESADOR';
      return {
        passed,
        expected: '0 errores léxicos y "#include" reconocido como DIRECTIVA_PREPROCESADOR',
        actual: `${result.errors.length} errores. Token "#include": ${prepToken?.type || 'No hallado'}`
      };
    }
  },
  {
    id: 'test-11-c-unclosed-block-comment',
    name: 'Criterio 11: Comentario de bloque sin cerrar en C/JS',
    language: 'c',
    code: '/* Comentario sin terminar\nint a = 5;',
    assertion: (result, deps) => {
      const err = result.errors.find(e => e.type === 'COMENTARIO_SIN_CERRAR');
      const passed = result.errors.length === 1 && !!err;
      return {
        passed,
        expected: '1 error COMENTARIO_SIN_CERRAR al llegar a fin de archivo',
        actual: `${result.errors.length} errores. Error detectado: ${err?.type || 'ninguno'}`
      };
    }
  },
  {
    id: 'test-12-multi-error-recovery',
    name: 'Criterio 12: Recuperación de errores múltiples',
    language: 'python',
    code: '@inicio = 9abc + "cadena rota',
    assertion: (result, deps) => {
      const hasAt = result.errors.some(e => e.lexeme === '@');
      const has9abc = result.errors.some(e => e.lexeme === '9abc');
      const hasStr = result.errors.some(e => e.type === 'CADENA_SIN_CERRAR');
      const passed = hasAt && has9abc && hasStr && result.errors.length >= 3;
      return {
        passed,
        expected: 'Mínimo 3 errores simultáneos recuperados (@, 9abc, cadena)',
        actual: `${result.errors.length} errores recuperados con éxito`
      };
    }
  }
];

class TestRunner {
  static runAll() {
    const deps = getDeps();
    const LexAnalyzerClass = deps.LexicalAnalyzer || (typeof window !== 'undefined' && window.MASL && window.MASL.LexicalAnalyzer);

    const results = [];
    let passedCount = 0;

    for (const test of TEST_CASES) {
      const analyzer = new LexAnalyzerClass(test.code, test.language);
      const scanResult = analyzer.tokenize(false);
      const outcome = test.assertion(scanResult, deps);

      if (outcome.passed) {
        passedCount++;
      }

      results.push({
        id: test.id,
        name: test.name,
        language: test.language,
        code: test.code,
        passed: outcome.passed,
        expected: outcome.expected,
        actual: outcome.actual
      });
    }

    return {
      total: TEST_CASES.length,
      passed: passedCount,
      failed: TEST_CASES.length - passedCount,
      percentage: Math.round((passedCount / TEST_CASES.length) * 100),
      results
    };
  }
}

if (typeof window !== 'undefined') {
  window.MASL = window.MASL || {};
  window.MASL.TEST_CASES = TEST_CASES;
  window.MASL.TestRunner = TestRunner;
}
