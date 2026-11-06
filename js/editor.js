/**
 * MASL - Analizador de Errores Léxicos
 * Componente de Editor de Código Interactivo con Resaltado, Gutter y Sincronización
 */

class CodeEditor {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Contenedor #${containerId} no encontrado`);
    }

    this.options = {
      placeholder: '# Escribe o pega tu código aquí...',
      readOnly: false,
      tabSize: 4,
      onInput: null,
      onCursorMove: null,
      ...options
    };

    this.tokens = [];
    this.errors = [];
    this.activeLine = 1;

    this.renderLayout();
    this.bindEvents();
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="masl-editor-wrapper">
        <div class="masl-gutter" id="editor-gutter" aria-hidden="true">
          <div class="gutter-lines" id="gutter-lines">
            <div class="gutter-line active" data-line="1"><span class="line-num">1</span></div>
          </div>
        </div>
        <div class="masl-code-area" id="editor-code-area">
          <div class="masl-highlight-layer" id="editor-highlight" aria-hidden="true"></div>
          <textarea 
            class="masl-textarea" 
            id="editor-textarea" 
            spellcheck="false" 
            autocapitalize="off" 
            autocomplete="off" 
            autocorrect="off"
            placeholder="${this.options.placeholder}"
          ></textarea>
        </div>
      </div>
    `;

    this.gutter = this.container.querySelector('#gutter-lines');
    this.gutterContainer = this.container.querySelector('#editor-gutter');
    this.highlightLayer = this.container.querySelector('#editor-highlight');
    this.textarea = this.container.querySelector('#editor-textarea');
    this.codeArea = this.container.querySelector('#editor-code-area');
  }

  bindEvents() {
    // Sincronización exacta de desplazamiento horizontal y vertical
    const syncScroll = () => {
      this.highlightLayer.scrollTop = this.textarea.scrollTop;
      this.highlightLayer.scrollLeft = this.textarea.scrollLeft;
      this.gutterContainer.scrollTop = this.textarea.scrollTop;
    };

    this.textarea.addEventListener('scroll', syncScroll);

    // Entrada de texto
    this.textarea.addEventListener('input', () => {
      this.updateLineNumbers();
      if (this.options.onInput) {
        this.options.onInput(this.getValue());
      }
    });

    // Seguimiento del cursor y línea activa
    const updateCursor = () => {
      const pos = this.getCursorPosition();
      this.activeLine = pos.line;
      this.highlightActiveGutterLine(pos.line);
      if (this.options.onCursorMove) {
        this.options.onCursorMove(pos);
      }
    };

    this.textarea.addEventListener('keyup', updateCursor);
    this.textarea.addEventListener('click', updateCursor);
    this.textarea.addEventListener('focus', updateCursor);

    // Soporte para tecla Tab (indentación estándar de 4 espacios)
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        const spaces = ' '.repeat(this.options.tabSize);

        const val = this.textarea.value;
        this.textarea.value = val.substring(0, start) + spaces + val.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + this.options.tabSize;

        this.updateLineNumbers();
        updateCursor();
        if (this.options.onInput) {
          this.options.onInput(this.getValue());
        }
      }
    });
  }

  getValue() {
    return this.textarea.value;
  }

  setValue(val) {
    this.textarea.value = val;
    this.updateLineNumbers();
    this.highlightRawText();
    const pos = this.getCursorPosition();
    this.highlightActiveGutterLine(pos.line);
    if (this.options.onInput) {
      this.options.onInput(val);
    }
  }

  updateLineNumbers() {
    const text = this.textarea.value;
    const lines = text.split(/\r\n|\r|\n/);
    const count = Math.max(lines.length, 1);

    const errorLines = new Set(this.errors.map(e => e.line));

    let html = '';
    for (let i = 1; i <= count; i++) {
      const hasError = errorLines.has(i);
      const isActive = i === this.activeLine;
      const classes = ['gutter-line'];
      if (hasError) classes.push('has-error');
      if (isActive) classes.push('active');

      const indicator = hasError ? '<span class="gutter-dot" title="Error léxico en línea ' + i + '">●</span>' : '';
      html += `<div class="${classes.join(' ')}" data-line="${i}">${indicator}<span class="line-num">${i}</span></div>`;
    }
    this.gutter.innerHTML = html;
  }

  highlightActiveGutterLine(line) {
    this.container.querySelectorAll('.gutter-line').forEach(el => {
      const lineNum = parseInt(el.getAttribute('data-line'), 10);
      el.classList.toggle('active', lineNum === line);
    });
  }

  applyTokenHighlighting(tokens, errors) {
    this.tokens = tokens || [];
    this.errors = errors || [];

    const source = this.textarea.value;
    if (!source) {
      this.highlightLayer.innerHTML = '';
      this.updateLineNumbers();
      return;
    }

    if (this.tokens.length === 0 && this.errors.length === 0) {
      this.highlightRawText();
      this.updateLineNumbers();
      return;
    }

    let html = '';
    let lastIndex = 0;

    const sortedTokens = [...this.tokens].sort((a, b) => a.start - b.start);

    for (const tok of sortedTokens) {
      if (tok.start > lastIndex) {
        html += this.escapeHtml(source.substring(lastIndex, tok.start));
      }

      const escapedLexeme = this.escapeHtml(tok.lexeme);
      const isError = tok.type === 'ERROR' || (tok.errorRef);
      const errorId = isError && tok.errorRef ? `id="code-err-${tok.errorRef.id}"` : '';
      const tooltip = isError && tok.errorRef ? `title="${this.escapeHtml(tok.errorRef.explanation)}"` : '';

      const className = isError
        ? 'token-span tok-error wavy-underline'
        : `token-span tok-${tok.type.toLowerCase()}`;

      html += `<span class="${className}" ${errorId} ${tooltip} data-start="${tok.start}" data-end="${tok.end}" data-line="${tok.line}" data-col="${tok.column}">${escapedLexeme}</span>`;

      lastIndex = tok.end;
    }

    if (lastIndex < source.length) {
      html += this.escapeHtml(source.substring(lastIndex));
    }

    if (source.endsWith('\n')) {
      html += '\n';
    }

    this.highlightLayer.innerHTML = html;
    this.updateLineNumbers();
  }

  highlightRawText() {
    const raw = this.textarea.value;
    this.highlightLayer.innerHTML = this.escapeHtml(raw) + (raw.endsWith('\n') ? '\n' : '');
  }

  jumpToPosition(line, column, length = 1) {
    const text = this.textarea.value;
    const lines = text.split(/\r\n|\r|\n/);

    let offset = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1;
    }
    offset += Math.max(0, column - 1);

    this.textarea.focus();
    this.textarea.setSelectionRange(offset, offset + length);

    const lineHeight = 24;
    const targetScroll = Math.max(0, (line - 3) * lineHeight);
    this.textarea.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });

    this.activeLine = line;
    this.highlightActiveGutterLine(line);

    const span = this.container.querySelector(`.token-span[data-line="${line}"][data-col="${column}"]`);
    if (span) {
      span.classList.add('error-pulse-active');
      setTimeout(() => {
        span.classList.remove('error-pulse-active');
      }, 2500);
    }
  }

  getCursorPosition() {
    const text = this.textarea.value;
    const selStart = this.textarea.selectionStart || 0;

    const lines = text.substring(0, selStart).split('\n');
    const currentLine = lines.length;
    const currentColumn = lines[lines.length - 1].length + 1;

    return {
      line: currentLine,
      column: currentColumn,
      offset: selStart,
      totalLength: text.length
    };
  }

  escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

if (typeof window !== 'undefined') {
  window.MASL = window.MASL || {};
  window.MASL.CodeEditor = CodeEditor;
}