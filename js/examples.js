/**
 * MASL - Analizador de Errores Léxicos
 * Biblioteca de Ejemplos Predefinidos por Lenguaje
 */

const EXAMPLES = {
  python: [
    {
      id: 'py-valid',
      name: 'Código Válido (Cálculo de Factorial)',
      category: 'valid',
      description: 'Función en Python con palabras reservadas, números, operadores y comentarios.',
      expected: '0 errores léxicos. Tokens clasificados correctamente.',
      code: `# Función para calcular el factorial en Python
def calcular_factorial(numero):
    if numero < 0:
        return None
    resultado = 1
    contador = 1
    while contador <= numero:
        resultado = resultado * contador
        contador += 1
    return resultado

limite = 5
total = calcular_factorial(limite)
`
    },
    {
      id: 'py-at-symbol',
      name: 'Error Léxico: Símbolo prohibido "@"',
      category: 'error',
      description: 'Uso del símbolo @ fuera del alfabeto léxico definido para el curso.',
      expected: '1 error léxico en el símbolo @ (Línea 3, Col 8).',
      code: `# En esta especificación simplificada, @ no pertenece al alfabeto
precio_base = 150
tasa = 5 @ 3
total = precio_base + tasa
`
    },
    {
      id: 'py-malformed-id',
      name: 'Error Léxico: Identificador "9variable"',
      category: 'error',
      description: 'Identificador mal formado que comienza con un dígito numérico.',
      expected: '1 error léxico: 9variable no cumple [a-zA-Z_][a-zA-Z0-9_]*.',
      code: `# Los identificadores nunca pueden iniciar con dígitos
9variable = 100
valor_final = 9variable * 2
`
    },
    {
      id: 'py-unclosed-str',
      name: 'Error Léxico: Cadena sin cerrar',
      category: 'error',
      description: 'Cadena con comilla inicial sin comilla de cierre en la misma línea.',
      expected: '1 error léxico: Cadena sin cerrar.',
      code: `# Cadena sin comilla de cierre
mensaje = "Bienvenido a Autómatas I
print(mensaje)
`
    },
    {
      id: 'py-malformed-num',
      name: 'Error Léxico: Número "3.14.15"',
      category: 'error',
      description: 'Número decimal con múltiples puntos separadores.',
      expected: '1 error léxico: Número mal formado (múltiples puntos decimales).',
      code: `# Un número decimal solo puede tener un único punto
pi_aproximado = 3.14.15
radio = 10
area = pi_aproximado * radio ** 2
`
    },
    {
      id: 'py-syntactic-case',
      name: 'Caso Sintáctico: "20 + * 5;"',
      category: 'syntactic',
      description: 'Tokens individualmente válidos pero gramática de expresión rota.',
      expected: '0 errores léxicos. Alerta didáctica sobre error sintáctico.',
      code: `# Caso didáctico crucial: ¿Léxico o Sintáctico?
# Los tokens 20, +, *, 5, ; son léxicamente válidos.
resultado = 20 + * 5;
`
    },
    {
      id: 'py-multi-errors',
      name: 'Múltiples Errores Simultáneos',
      category: 'multi_error',
      description: 'Demuestra la recuperación del lexer encontrando varios errores a la vez.',
      expected: '4 errores léxicos: @, 8items, 7.8.9 y cadena sin cerrar.',
      code: `# Este fragmento contiene 4 errores léxicos distintos:
factor = @ 10
8items = 50
constante = 7.8.9
texto = "error de cadena
valor_valido = 42
`
    }
  ],

  javascript: [
    {
      id: 'js-valid',
      name: 'Código Válido (Arrow Function & Objetos)',
      category: 'valid',
      description: 'Código JavaScript moderno con let, const, funciones flecha y hexadecimal.',
      expected: '0 errores léxicos. Tokens clasificados con éxito.',
      code: `// Cálculo de descuento en JavaScript
const calcularDescuento = (monto, porcentaje) => {
    let descuento = monto * (porcentaje / 100);
    return monto - descuento;
};

let precio = 250.50;
let mascaraHex = 0xFF;
let resultadoFinal = calcularDescuento(precio, 15);
`
    },
    {
      id: 'js-at-symbol',
      name: 'Error Léxico: Símbolo prohibido "@"',
      category: 'error',
      description: 'Símbolo @ en JavaScript fuera del alfabeto.',
      expected: '1 error léxico en el símbolo @.',
      code: `// En JS básico el símbolo @ no es parte de identificadores
let usuario@correo = "test";
let valido = 10;
`
    },
    {
      id: 'js-malformed-id',
      name: 'Error Léxico: Identificador "7contador"',
      category: 'error',
      description: 'Variable iniciada con dígito.',
      expected: '1 error léxico: Identificador mal formado.',
      code: `// Identificador mal formado que comienza con dígito
let 7contador = 0;
while (7contador < 10) {
    7contador++;
}
`
    },
    {
      id: 'js-unclosed-str',
      name: 'Error Léxico: Template String sin cerrar',
      category: 'error',
      description: 'Template literal con acento grave (`) sin delimitador final.',
      expected: '1 error léxico: Cadena sin cerrar.',
      code: `// Cadena con acento grave sin cerrar antes del EOF
let saludo = \`Hola estimado estudiante de Autómatas I
console.log(saludo);
`
    },
    {
      id: 'js-malformed-num',
      name: 'Error Léxico: Hexadecimal "0xZZ"',
      category: 'error',
      description: 'Prefijo hexadecimal seguido de caracteres fuera del rango 0-9, a-f.',
      expected: '1 error léxico: Número hexadecimal mal formado.',
      code: `// 0x requiere dígitos hexadecimales válidos
let colorInvalido = 0xZZ;
let mascaraValida = 0x1A;
`
    },
    {
      id: 'js-unclosed-comment',
      name: 'Error Léxico: Comentario de bloque sin cerrar',
      category: 'error',
      description: 'Comentario /* que no tiene */ antes del fin de archivo.',
      expected: '1 error léxico: Comentario de bloque sin cerrar.',
      code: `/* Comentario de bloque que nunca se cierra
let x = 10;
let y = 20;
`
    },
    {
      id: 'js-syntactic-case',
      name: 'Caso Sintáctico: "20 + * 5;"',
      category: 'syntactic',
      description: 'Demostración de expresión sintácticamente rota pero léxicamente limpia.',
      expected: '0 errores léxicos. Mensaje explicativo sobre gramática/parser.',
      code: `// Expresión matemáticamente inválida
// pero todos los tokens existen en el alfabeto de JavaScript
let valor = 20 + * 5;
`
    },
    {
      id: 'js-multi-errors',
      name: 'Múltiples Errores Simultáneos',
      category: 'multi_error',
      description: 'Varios errores léxicos en JavaScript.',
      expected: '3 errores léxicos reportados con recuperación.',
      code: `let 5variable = 100;
let simbolo = @;
let numeroRoto = 4.5.6.7;
let correcto = true;
`
    }
  ],

  c: [
    {
      id: 'c-valid',
      name: 'Código Válido (#include, struct, tipos)',
      category: 'valid',
      description: 'Programa en C con directivas de preprocesador, tipos nativos y punteros.',
      expected: '0 errores léxicos.',
      code: `#include <stdio.h>

struct Punto {
    int x;
    int y;
};

int main() {
    float pi = 3.14159f;
    long limite = 1000L;
    char letra = 'A';
    int total = 0;

    for (int i = 0; i < 10; i++) {
        total += i;
    }
    return 0;
}
`
    },
    {
      id: 'c-dollar-symbol',
      name: 'Error Léxico: Símbolo prohibido "$"',
      category: 'error',
      description: 'En C, a diferencia de JS, el símbolo $ no está permitido en variables.',
      expected: '1 error léxico: $ fuera del alfabeto de C.',
      code: `#include <stdio.h>

int main() {
    int $precio = 500;
    return 0;
}
`
    },
    {
      id: 'c-malformed-id',
      name: 'Error Léxico: Identificador "4dimension"',
      category: 'error',
      description: 'Identificador que inicia con número 4.',
      expected: '1 error léxico: Identificador mal formado.',
      code: `#include <stdio.h>

int main() {
    int 4dimension = 4;
    return 0;
}
`
    },
    {
      id: 'c-unclosed-char',
      name: 'Error Léxico: Carácter sin cerrar',
      category: 'error',
      description: 'Literal de carácter en comillas simples sin cerrar.',
      expected: '1 error léxico: Literal de carácter sin cerrar.',
      code: `#include <stdio.h>

int main() {
    char vocal = 'a;
    return 0;
}
`
    },
    {
      id: 'c-malformed-num',
      name: 'Error Léxico: Sufijo no reconocido "12abc"',
      category: 'error',
      description: 'Número entero seguido inmediatamente de identificador no reconocido.',
      expected: '1 error léxico: Identificador o número mal formado.',
      code: `#include <stdio.h>

int main() {
    int valor = 12abc;
    return 0;
}
`
    },
    {
      id: 'c-syntactic-case',
      name: 'Caso Sintáctico: "20 + * 5;"',
      category: 'syntactic',
      description: 'Sentencia en C con dos operadores binarios contiguos.',
      expected: '0 errores léxicos. Nota didáctica sobre fase sintáctica.',
      code: `#include <stdio.h>

int main() {
    int x = 20 + * 5;
    return 0;
}
`
    },
    {
      id: 'c-multi-errors',
      name: 'Múltiples Errores Simultáneos',
      category: 'multi_error',
      description: 'Múltiples errores léxicos combinados en C.',
      expected: '3 errores: símbolo $, identificador mal formado y número.',
      code: `#include <stdio.h>

int main() {
    float @tasa = 12.3.4;
    int 9contador = 0;
    return 0;
}
`
    }
  ]
};

if (typeof window !== 'undefined') {
  window.MASL = window.MASL || {};
  window.MASL.EXAMPLES = EXAMPLES;
}
