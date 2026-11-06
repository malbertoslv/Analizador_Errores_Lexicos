/**
 * MASL - Analizador de Errores Léxicos
 * Controlador Principal de la Aplicación Web (UI & Orquestador)
 * 
 * Gestiona la interfaz, eventos de usuario, sincronización de temas,
 * panel de resultados y el flujo interactivo de la fase léxica.
 */

const getMaslGlobals = () => {
  if (typeof window !== 'undefined' && window.MASL) {
    return window.MASL;
  }
  return {};
};

class MaslApp {
  constructor() {
    this.currentLanguageId = 'python';
    this.analysisResult = null;
    this.editor = null;
    this.simulator = null;
    this.filterCategory = 'ALL';
    this.searchQuery = '';

    this.init();
  }

  init() {
    this.initTheme();
    this.initEditor();
    this.initSimulator();
    this.renderLanguageTabs();
    this.renderExamplesDropdown();
    this.bindGlobalEvents();

    // Cargar ejemplo inicial por defecto
    this.loadExample('py-valid');
  }

  getLANGUAGES() {
    const g = getMaslGlobals();
    return g.LANGUAGES || {};
  }

  getEXAMPLES() {
    const g = getMaslGlobals();
    return g.EXAMPLES || {};
  }

  // ==========================================
  // CONFIGURACIÓN DE TEMA (DARK / LIGHT)
  // ==========================================

  initTheme() {
    const savedTheme = localStorage.getItem('masl_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeButtonIcon(savedTheme);

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('masl_theme', newTheme);
        this.updateThemeButtonIcon(newTheme);
      });
    }
  }

  updateThemeButtonIcon(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    const isDark = theme === 'dark';
    btn.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    btn.setAttribute('data-tooltip', isDark ? 'Modo claro' : 'Modo oscuro');
    btn.innerHTML = isDark
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  }

  // ==========================================
  // INICIALIZACIÓN DE COMPONENTES
  // ==========================================

  initEditor() {
    const g = getMaslGlobals();
    const EditorClass = g.CodeEditor || window.CodeEditor;

    this.editor = new EditorClass('editor-container', {
      placeholder: '# Escribe o pega tu código para analizar errores léxicos...\n# Presiona "Analizar código" o Ctrl+Enter.',
      onInput: (val) => {
        this.markAnalysisDirty();
        this.hideExampleBanner();
        this.updateCharCount(val.length);
      },
      onCursorMove: (pos) => {
        const lineColEl = document.getElementById('cursor-line-col');
        if (lineColEl) {
          lineColEl.textContent = `Ln ${pos.line}, Col ${pos.column}`;
        }
        this.updateCharCount(pos.totalLength);
      }
    });

    this.updateFilename();
  }

  updateCharCount(count) {
    const charEl = document.getElementById('cursor-char-count');
    if (charEl) {
      charEl.textContent = `${count} caracteres`;
    }
  }

  updateFilename() {
    const filenameEl = document.getElementById('editor-filename');
    if (!filenameEl) return;
    const langs = this.getLANGUAGES();
    const lang = langs[this.currentLanguageId];
    filenameEl.textContent = lang?.fileName || `code.${lang?.fileExt || 'txt'}`;
  }

  initSimulator() {
    const g = getMaslGlobals();
    const SimClass = g.StepSimulator || window.StepSimulator;

    this.simulator = new SimClass(
      [],
      (step, index, total) => this.handleSimulatorStep(step, index, total),
      () => this.handleSimulatorComplete()
    );
  }

  // ==========================================
  // CONTROL DE LENGUAJE Y EJEMPLOS
  // ==========================================

  renderLanguageTabs() {
    const container = document.getElementById('language-tabs');
    if (!container) return;

    const langs = this.getLANGUAGES();
    let html = '';
    for (const [id, lang] of Object.entries(langs)) {
      const active = id === this.currentLanguageId ? 'active' : '';
      html += `
        <button class="lang-tab-btn ${active}" data-lang="${id}" role="tab" aria-selected="${id === this.currentLanguageId}">
          <span class="lang-tab-indicator"></span>
          <span class="lang-name">${lang.name}</span>
        </button>
      `;
    }
    container.innerHTML = html;

    container.querySelectorAll('.lang-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const langId = btn.getAttribute('data-lang');
        this.setLanguage(langId);
      });
    });
  }

  setLanguage(langId) {
    const langs = this.getLANGUAGES();
    if (!langs[langId]) return;
    this.currentLanguageId = langId;

    document.querySelectorAll('.lang-tab-btn').forEach(btn => {
      const isCurrent = btn.getAttribute('data-lang') === langId;
      btn.classList.toggle('active', isCurrent);
      btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
    });

    this.updateFilename();
    this.renderExamplesDropdown();

    const examples = this.getEXAMPLES();
    const firstExample = examples[langId]?.[0];
    if (firstExample) {
      this.loadExample(firstExample.id);
    } else {
      this.analyzeCode();
    }
  }

  renderExamplesDropdown() {
    const select = document.getElementById('example-select');
    if (!select) return;

    const examples = this.getEXAMPLES();
    const list = examples[this.currentLanguageId] || [];
    let html = '<option value="" disabled selected>Seleccionar ejemplo...</option>';

    list.forEach(item => {
      let prefix = '●';
      if (item.category === 'valid') prefix = '✓';
      if (item.category === 'error') prefix = '✕';
      if (item.category === 'syntactic') prefix = '⚠';
      if (item.category === 'multi_error') prefix = '✦';
      html += `<option value="${item.id}">${prefix} ${item.name}</option>`;
    });

    select.innerHTML = html;
  }

  loadExample(exampleId) {
    const examples = this.getEXAMPLES();
    const list = examples[this.currentLanguageId] || [];
    const item = list.find(ex => ex.id === exampleId);
    if (!item) return;

    this.editor.setValue(item.code);
    this.showExampleBanner(item);
    this.analyzeCode();

    const select = document.getElementById('example-select');
    if (select && select.value !== exampleId) {
      select.value = exampleId;
    }
  }

  showExampleBanner(item) {
    const descEl = document.getElementById('example-description-banner');
    if (!descEl) return;

    const isZeroErrors = item.expected.includes('0 errores');
    const badgeClass = isZeroErrors ? 'badge-success' : 'badge-error';

    descEl.innerHTML = `
      <div class="example-banner-content">
        <div class="example-banner-main">
          <div class="example-banner-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <strong>${item.name}</strong>
          </div>
          <p class="example-banner-desc">${item.description}</p>
        </div>
        <div class="example-banner-right">
          <span class="example-expected-pill ${badgeClass}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/></svg>
            ${item.expected}
          </span>
          <button class="example-banner-close-btn" id="close-example-banner-btn" title="Cerrar descripción">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `;

    descEl.style.display = 'block';

    const closeBtn = document.getElementById('close-example-banner-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideExampleBanner());
    }
  }

  hideExampleBanner() {
    const descEl = document.getElementById('example-description-banner');
    if (descEl) {
      descEl.style.display = 'none';
    }
  }

  // ==========================================
  // EJECUCIÓN DEL ANÁLISIS LÉXICO
  // ==========================================

  analyzeCode() {
    const code = this.editor.getValue();

    if (!code || code.trim().length === 0) {
      this.renderEmptyState();
      return;
    }

    const g = getMaslGlobals();
    const LexAnalyzerClass = g.LexicalAnalyzer;
    const SyntacticDetector = g.SyntacticHintDetector;

    const analyzer = new LexAnalyzerClass(code, this.currentLanguageId);
    this.analysisResult = analyzer.tokenize(true);

    if (SyntacticDetector) {
      this.analysisResult.syntacticHint = SyntacticDetector.inspect(
        this.analysisResult.tokens,
        this.analysisResult.errors
      );
    }

    this.editor.applyTokenHighlighting(this.analysisResult.tokens, this.analysisResult.errors);

    this.simulator.setSteps(this.analysisResult.steps);
    this.updateSimulatorHUD(null, -1, this.analysisResult.steps.length);

    this.renderVerdict();
    this.renderSyntacticNotice();
    this.renderStats();
    this.renderErrorsList();
    this.renderTokensTable();
  }

  markAnalysisDirty() {
    const banner = document.getElementById('dirty-code-indicator');
    if (banner) {
      banner.style.display = 'inline-flex';
    }
  }

  renderEmptyState() {
    this.analysisResult = null;
    this.editor.applyTokenHighlighting([], []);

    const verdictEl = document.getElementById('verdict-container');
    if (verdictEl) {
      verdictEl.innerHTML = `
        <div class="verdict-banner empty-state">
          <div class="verdict-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </div>
          <div class="verdict-content">
            <h4 class="verdict-title">Sin código analizado</h4>
            <p class="verdict-subtitle">Escribe código en el editor o elige un ejemplo y presiona <strong>"Analizar código"</strong>.</p>
          </div>
        </div>
      `;
    }

    document.getElementById('syntactic-notice-container').innerHTML = '';
    document.getElementById('syntactic-notice-container').style.display = 'none';
    document.getElementById('stats-container').innerHTML = `
      <div class="empty-list-discreet">Realiza un análisis para consultar estadísticas.</div>
    `;
    document.getElementById('errors-container').innerHTML = `
      <div class="empty-list-discreet">No hay código para analizar.</div>
    `;
    document.getElementById('tokens-tbody').innerHTML = `
      <tr><td colspan="5" class="empty-table-notice">Presiona "Analizar código" para ver los tokens clasificados.</td></tr>
    `;
    document.getElementById('tokens-count-badge').textContent = '0';
    document.getElementById('errors-count-badge').textContent = '0';
  }

  // ==========================================
  // RENDERIZADO DE RESULTADOS (COMPACTO Y LIMPIO)
  // ==========================================

  renderVerdict() {
    const dirtyIndicator = document.getElementById('dirty-code-indicator');
    if (dirtyIndicator) dirtyIndicator.style.display = 'none';

    const container = document.getElementById('verdict-container');
    if (!container || !this.analysisResult) return;

    const errorCount = this.analysisResult.errors.length;
    const tokenCount = this.analysisResult.stats.totalTokens;
    const langs = this.getLANGUAGES();
    const langName = langs[this.currentLanguageId]?.name || '';

    if (errorCount === 0) {
      container.innerHTML = `
        <div class="verdict-banner success animate-fade-in">
          <div class="verdict-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div class="verdict-content">
            <h4 class="verdict-title">Sin errores léxicos</h4>
            <p class="verdict-subtitle">Todos los lexemas analizados pertenecen al alfabeto Σ de <strong>${langName}</strong>.</p>
          </div>
          <div class="verdict-metrics-pill success">
            <span><strong>${tokenCount}</strong> tokens válidos</span>
            <span class="pill-divider">•</span>
            <span>0 errores</span>
          </div>
        </div>
      `;
    } else {
      const plural = errorCount === 1 ? 'error léxico detectado' : 'errores léxicos detectados';
      container.innerHTML = `
        <div class="verdict-banner error animate-fade-in">
          <div class="verdict-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div class="verdict-content">
            <h4 class="verdict-title">${errorCount} ${plural}</h4>
            <p class="verdict-subtitle">Se encontraron símbolos fuera del alfabeto o tokens mal estructurados.</p>
          </div>
          <div class="verdict-metrics-pill error">
            <span><strong>${errorCount}</strong> ${errorCount === 1 ? 'error' : 'errores'}</span>
            <span class="pill-divider">•</span>
            <span><strong>${tokenCount}</strong> tokens</span>
          </div>
        </div>
      `;
    }
  }

  renderSyntacticNotice() {
    const container = document.getElementById('syntactic-notice-container');
    if (!container || !this.analysisResult) return;

    const hint = this.analysisResult.syntacticHint;
    if (hint && hint.detected) {
      container.innerHTML = `
        <div class="syntactic-notice-card animate-slide-down">
          <div class="notice-header">
            <span class="notice-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </span>
            <span class="notice-title">${hint.title}</span>
            <span class="notice-badge">Fase de Parsing</span>
          </div>
          <div class="notice-body">
            <p class="notice-highlight">${hint.message}</p>
            <div class="notice-details">${hint.detailedExplanation}</div>
            <div class="notice-meta">
              <span><strong>Tokens:</strong> ${hint.tokensInvolved}</span> • 
              <span><strong>Ubicación:</strong> ${hint.position}</span>
            </div>
          </div>
        </div>
      `;
      container.style.display = 'block';
    } else {
      container.innerHTML = '';
      container.style.display = 'none';
    }
  }

  renderErrorsList() {
    const container = document.getElementById('errors-container');
    const badge = document.getElementById('errors-count-badge');
    if (!container || !this.analysisResult) return;

    const errors = this.analysisResult.errors;
    if (badge) badge.textContent = errors.length;

    // Cuando no hay errores, se muestra un mensaje discreto y limpio (NO duplicado)
    if (errors.length === 0) {
      container.innerHTML = `
        <div class="empty-list-discreet">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <div>
            <strong>0 errores léxicos</strong>
            <p>El código no contiene símbolos prohibidos ni tokens mal formados.</p>
          </div>
        </div>
      `;
      return;
    }

    let html = '';
    errors.forEach((err) => {
      const typeLabel = this.formatErrorTypeName(err.type);
      html += `
        <div class="error-card" data-error-id="${err.id}" data-line="${err.line}" data-col="${err.column}" data-len="${err.lexeme.length}">
          <div class="error-card-header">
            <span class="error-type-tag">${typeLabel}</span>
            <span class="error-pos-tag">Ln ${err.line}, Col ${err.column}</span>
          </div>
          <div class="error-card-body">
            <div class="invalid-lexeme-box">
              <span class="lexeme-label">Lexema inválido:</span>
              <code class="lexeme-code">${this.escapeHtml(err.lexeme)}</code>
            </div>
            <p class="error-explanation">${err.explanation}</p>
          </div>
          <div class="error-card-footer">
            <button class="btn-jump-error" title="Ubicar este error en el editor">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Ubicar en editor</span>
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.error-card').forEach(card => {
      const line = parseInt(card.getAttribute('data-line'), 10);
      const col = parseInt(card.getAttribute('data-col'), 10);
      const len = parseInt(card.getAttribute('data-len'), 10);

      card.addEventListener('click', () => {
        this.editor.jumpToPosition(line, col, len);
      });
    });
  }

  renderTokensTable() {
    const tbody = document.getElementById('tokens-tbody');
    const badge = document.getElementById('tokens-count-badge');
    if (!tbody || !this.analysisResult) return;

    let tokens = this.analysisResult.tokens;
    if (badge) badge.textContent = tokens.length;

    if (this.filterCategory !== 'ALL') {
      tokens = tokens.filter(t => t.type === this.filterCategory);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      tokens = tokens.filter(t => t.lexeme.toLowerCase().includes(q));
    }

    if (tokens.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="5" class="empty-table-notice">No se encontraron tokens con los filtros seleccionados.</td></tr>
      `;
      return;
    }

    let html = '';
    tokens.forEach((tok) => {
      const isError = tok.type === 'ERROR';
      const rowClass = isError ? 'table-row-error' : 'table-row-valid';
      const catClass = `cat-badge cat-${tok.type.toLowerCase()}`;

      html += `
        <tr class="${rowClass}" data-line="${tok.line}" data-col="${tok.column}" data-len="${tok.lexeme.length}">
          <td class="col-id">${tok.id}</td>
          <td class="col-lexeme"><code>${this.escapeHtml(tok.lexeme)}</code></td>
          <td class="col-type"><span class="${catClass}">${this.formatCategoryName(tok.type)}</span></td>
          <td class="col-pos">${tok.line}</td>
          <td class="col-pos">${tok.column}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    tbody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('click', () => {
        const line = parseInt(row.getAttribute('data-line'), 10);
        const col = parseInt(row.getAttribute('data-col'), 10);
        const len = parseInt(row.getAttribute('data-len'), 10);
        if (line && col) {
          this.editor.jumpToPosition(line, col, len);
        }
      });
    });
  }

  renderStats() {
    const container = document.getElementById('stats-container');
    if (!container || !this.analysisResult) return;

    const stats = this.analysisResult.stats;
    const counts = stats.counts;

    const categoriesWithCount = Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    const colors = {
      PALABRA_RESERVADA: '#a78bfa',
      IDENTIFICADOR: '#60a5fa',
      NUMERO_ENTERO: '#34d399',
      NUMERO_DECIMAL: '#10b981',
      NUMERO_HEXADECIMAL: '#059669',
      CADENA: '#f472b6',
      CARACTER: '#fb7185',
      OPERADOR: '#38bdf8',
      DELIMITADOR: '#fbbf24',
      COMENTARIO: '#9ca3af',
      DIRECTIVA_PREPROCESADOR: '#f59e0b'
    };

    let chartBarsHtml = '';
    categoriesWithCount.forEach(([cat, count]) => {
      const percentage = Math.round((count / (stats.totalTokens || 1)) * 100);
      const color = colors[cat] || '#818cf8';
      chartBarsHtml += `
        <div class="stat-bar-row" title="${cat}: ${count} (${percentage}%)">
          <div class="stat-bar-label">
            <span class="color-dot" style="background-color: ${color}"></span>
            <span class="cat-name">${this.formatCategoryName(cat)}</span>
          </div>
          <div class="stat-bar-track">
            <div class="stat-bar-fill" style="width: ${Math.max(percentage, 4)}%; background-color: ${color}"></div>
          </div>
          <div class="stat-bar-value">${count} <span class="stat-pct">(${percentage}%)</span></div>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-mini-card">
          <div class="mini-label">Tokens</div>
          <div class="mini-value text-accent">${stats.totalTokens}</div>
        </div>
        <div class="stat-mini-card">
          <div class="mini-label">Errores</div>
          <div class="mini-value ${stats.totalErrors > 0 ? 'text-danger' : 'text-success'}">${stats.totalErrors}</div>
        </div>
        <div class="stat-mini-card">
          <div class="mini-label">Líneas</div>
          <div class="mini-value">${stats.linesCount}</div>
        </div>
        <div class="stat-mini-card">
          <div class="mini-label">Tiempo</div>
          <div class="mini-value">${stats.scanTimeMs} ms</div>
        </div>
      </div>

      ${categoriesWithCount.length > 0 ? `
        <div class="stat-distribution-section">
          <h5 class="dist-title">Distribución de Tokens por Categoría</h5>
          <div class="stat-bars-container">
            ${chartBarsHtml}
          </div>
        </div>
      ` : ''}
    `;
  }

  // ==========================================
  // SIMULADOR PASO A PASO
  // ==========================================

  handleSimulatorStep(step, index, total) {
    this.updateSimulatorHUD(step, index, total);

    if (step) {
      this.editor.jumpToPosition(step.line, step.column, step.lexeme.length);

      const rows = document.querySelectorAll('#tokens-tbody tr');
      rows.forEach(r => r.classList.remove('sim-active-row'));
      if (rows[index]) {
        rows[index].classList.add('sim-active-row');
        rows[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  handleSimulatorComplete() {
    this.updateSimulatorPlayBtn(false);
    const msgEl = document.getElementById('sim-current-message');
    if (msgEl) {
      msgEl.textContent = 'Simulación completada con éxito. Fin de la entrada léxica.';
    }
  }

  updateSimulatorHUD(step, index, total) {
    const progressEl = document.getElementById('sim-progress-text');
    const stateEl = document.getElementById('sim-current-state');
    const charEl = document.getElementById('sim-current-char');
    const msgEl = document.getElementById('sim-current-message');
    const progressBar = document.getElementById('sim-progress-bar-inner');

    if (progressEl) {
      const curr = index >= 0 ? index + 1 : 0;
      progressEl.textContent = `Paso ${curr} de ${total}`;
    }

    if (progressBar && total > 0) {
      const pct = Math.max(0, Math.min(100, Math.round(((index + 1) / total) * 100)));
      progressBar.style.width = `${pct}%`;
    }

    if (step) {
      if (stateEl) stateEl.textContent = step.stateName || 'q0 (Estado inicial)';
      if (charEl) charEl.textContent = `"${step.lexeme}" (L:${step.line}, C:${step.column})`;
      if (msgEl) msgEl.textContent = step.message || 'Procesando carácter...';
    } else {
      if (stateEl) stateEl.textContent = 'q0 (Inicio)';
      if (charEl) charEl.textContent = 'Esperando inicio...';
      if (msgEl) msgEl.textContent = 'Presiona "Reproducir" o "Siguiente" para observar la transición del autómata.';
    }
  }

  updateSimulatorPlayBtn(isPlaying) {
    const btn = document.getElementById('sim-play-pause-btn');
    if (!btn) return;
    btn.innerHTML = isPlaying
      ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> <span>Pausar</span>`
      : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> <span>Reproducir</span>`;
    btn.classList.toggle('playing', isPlaying);
  }

  // ==========================================
  // VINCULACIÓN DE EVENTOS GLOBALES
  // ==========================================

  bindGlobalEvents() {
    // Botón Analizar
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.analyzeCode());
    }

    // Atajo Ctrl+Enter
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.analyzeCode();
      }
    });

    // Botón Limpiar
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.editor.setValue('');
        this.renderEmptyState();
        this.hideExampleBanner();
      });
    }

    // Selector de Ejemplos
    const exampleSelect = document.getElementById('example-select');
    if (exampleSelect) {
      exampleSelect.addEventListener('change', (e) => {
        this.loadExample(e.target.value);
      });
    }

    // Filtros de categoría en la tabla de tokens
    const categoryFilterSelect = document.getElementById('token-category-filter');
    if (categoryFilterSelect) {
      categoryFilterSelect.addEventListener('change', (e) => {
        this.filterCategory = e.target.value;
        this.renderTokensTable();
      });
    }

    // Buscador de tokens
    const tokenSearchInput = document.getElementById('token-search-input');
    if (tokenSearchInput) {
      tokenSearchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim();
        this.renderTokensTable();
      });
    }

    // Navegación de pestañas en panel de resultados
    const tabBtns = document.querySelectorAll('.results-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        const targetId = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-panel').forEach(panel => {
          panel.classList.toggle('active', panel.id === targetId);
        });
      });
    });

    // Controles del Simulador
    const simPlayBtn = document.getElementById('sim-play-pause-btn');
    if (simPlayBtn) {
      simPlayBtn.addEventListener('click', () => {
        if (this.simulator.isPlaying) {
          this.simulator.pause();
          this.updateSimulatorPlayBtn(false);
        } else {
          this.simulator.play();
          this.updateSimulatorPlayBtn(true);
        }
      });
    }

    const simNextBtn = document.getElementById('sim-next-btn');
    if (simNextBtn) {
      simNextBtn.addEventListener('click', () => {
        this.simulator.pause();
        this.updateSimulatorPlayBtn(false);
        this.simulator.next();
      });
    }

    const simPrevBtn = document.getElementById('sim-prev-btn');
    if (simPrevBtn) {
      simPrevBtn.addEventListener('click', () => {
        this.simulator.pause();
        this.updateSimulatorPlayBtn(false);
        this.simulator.previous();
      });
    }

    const simResetBtn = document.getElementById('sim-reset-btn');
    if (simResetBtn) {
      simResetBtn.addEventListener('click', () => {
        this.simulator.reset();
        this.updateSimulatorPlayBtn(false);
      });
    }

    const simSpeedSelect = document.getElementById('sim-speed-select');
    if (simSpeedSelect) {
      simSpeedSelect.addEventListener('change', (e) => {
        this.simulator.setSpeed(parseInt(e.target.value, 10));
      });
    }

    // Botones de Modales
    document.getElementById('run-tests-modal-btn')?.addEventListener('click', () => this.openTestSuiteModal());
    document.getElementById('educational-guide-btn')?.addEventListener('click', () => this.openEducationalModal());

    // Menú Exportar Desplegable
    const exportBtn = document.getElementById('export-menu-btn');
    const exportDropdown = document.getElementById('export-dropdown-menu');
    if (exportBtn && exportDropdown) {
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportDropdown.classList.toggle('show');
      });
      document.addEventListener('click', (e) => {
        if (!exportBtn.contains(e.target) && !exportDropdown.contains(e.target)) {
          exportDropdown.classList.remove('show');
        }
      });
    }

    document.getElementById('export-json-btn')?.addEventListener('click', () => this.exportReport('json'));
    document.getElementById('export-text-btn')?.addEventListener('click', () => this.exportReport('text'));
    document.getElementById('download-report-btn')?.addEventListener('click', () => this.exportReport('download'));

    // Cierre de Modales
    document.querySelectorAll('.modal-close-btn, .modal-backdrop').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-close-btn') || e.target.closest('.modal-close-btn')) {
          this.closeAllModals();
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals();
        exportDropdown?.classList.remove('show');
      }
    });
  }

  // ==========================================
  // MODALES
  // ==========================================

  openTestSuiteModal() {
    const modal = document.getElementById('test-suite-modal');
    if (!modal) return;
    modal.classList.add('active');
    this.runAutomatedTests();
  }

  runAutomatedTests() {
    const container = document.getElementById('test-results-container');
    const summaryBadge = document.getElementById('test-summary-badge');
    if (!container) return;

    container.innerHTML = `<div class="test-loading">Ejecutando suite de 12 pruebas del compilador...</div>`;

    setTimeout(() => {
      const g = getMaslGlobals();
      const Runner = g.TestRunner;
      const suite = Runner.runAll();

      if (summaryBadge) {
        summaryBadge.textContent = `${suite.passed} / ${suite.total} Pasadas (${suite.percentage}%)`;
        summaryBadge.className = `modal-badge ${suite.failed === 0 ? 'badge-success' : 'badge-danger'}`;
      }

      let html = '';
      suite.results.forEach((t, i) => {
        const statusClass = t.passed ? 'test-passed' : 'test-failed';
        const iconSvg = t.passed
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-rose)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

        html += `
          <div class="test-item-card ${statusClass}">
            <div class="test-item-header">
              <span class="test-icon">${iconSvg}</span>
              <strong class="test-name">Prueba #${i + 1}: ${t.name}</strong>
              <span class="test-lang-tag">${t.language.toUpperCase()}</span>
            </div>
            <div class="test-code-snippet">
              <code>${this.escapeHtml(t.code)}</code>
            </div>
            <div class="test-assertions-grid">
              <div><strong>Esperado:</strong> ${t.expected}</div>
              <div><strong>Obtenido:</strong> ${t.actual}</div>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    }, 150);
  }

  openEducationalModal() {
    const modal = document.getElementById('educational-modal');
    if (!modal) return;
    this.renderEducationalContent();
    modal.classList.add('active');
  }

  renderEducationalContent() {
    const container = document.getElementById('educational-content-body');
    if (!container) return;

    const langs = this.getLANGUAGES();
    const lang = langs[this.currentLanguageId] || {};

    container.innerHTML = `
      <div class="edu-section">
        <h3>1. Fases del Compilador: Léxico vs. Sintáctico</h3>
        <p>En la materia <strong>Autómatas I</strong>, se estudia cómo un compilador analiza código fuente a través de fases secuenciales:</p>
        
        <div class="compiler-pipeline-diagram">
          <div class="pipeline-step active">
            <span class="step-num">Fase 1</span>
            <strong>Análisis Léxico (Scanner)</strong>
            <span>Autómata Finito (AFD / AFND)</span>
            <small>Genera: Flujo de Tokens</small>
          </div>
          <div class="pipeline-arrow">➔</div>
          <div class="pipeline-step">
            <span class="step-num">Fase 2</span>
            <strong>Análisis Sintáctico (Parser)</strong>
            <span>Autómata de Pila (AP / GLC)</span>
            <small>Genera: Árbol AST</small>
          </div>
          <div class="pipeline-arrow">➔</div>
          <div class="pipeline-step">
            <span class="step-num">Fase 3</span>
            <strong>Análisis Semántico</strong>
            <span>Verificación de Tipos y Tablas</span>
            <small>Genera: AST Decorado</small>
          </div>
        </div>

        <div class="edu-comparison-table">
          <table>
            <thead>
              <tr>
                <th>Dimensión</th>
                <th>Análisis Léxico (Esta App)</th>
                <th>Análisis Sintáctico (Siguiente Fase)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Unidad analizada</strong></td>
                <td>Carácter individual y lexema</td>
                <td>Secuencia u orden de tokens</td>
              </tr>
              <tr>
                <td><strong>Modelo formal</strong></td>
                <td>Autómata Finito / Expresiones Regulares (Lenguajes Tipo 3)</td>
                <td>Gramática Libre de Contexto / Autómata de Pila (Lenguajes Tipo 2)</td>
              </tr>
              <tr>
                <td><strong>¿Qué detecta?</strong></td>
                <td>Símbolos prohibidos (<code>@</code>), identificadores que inician con dígitos (<code>9abc</code>), cadenas sin cerrar.</td>
                <td>Estructuras rotas como <code>20 + * 5;</code>, paréntesis sin cerrar, sentencias sin operando.</td>
              </tr>
              <tr>
                <td><strong>Ejemplo clave</strong></td>
                <td><code>x = 5 @ 3</code> ➔ ❌ Error léxico (@ no está en el alfabeto).</td>
                <td><code>20 + * 5;</code> ➔ ✅ Válido léxicamente (los 5 tokens existen). ❌ Error sintáctico en el parser.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="edu-section">
        <h3>2. Alfabeto y Reglas Léxicas de ${lang.name || ''}</h3>
        <div class="lang-rules-summary">
          <p><strong>Alfabeto formal (Σ):</strong> ${lang.alphabetDescription || ''}</p>
          <ul class="lang-notes-list">
            ${(lang.educationalNotes || []).map(n => `<li>${n}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  closeAllModals() {
    document.querySelectorAll('.modal-wrapper').forEach(m => m.classList.remove('active'));
  }

  // ==========================================
  // EXPORTACIÓN DE REPORTES
  // ==========================================

  exportReport(format) {
    if (!this.analysisResult) {
      this.showToast('Primero realiza un análisis de código para exportar.', 'warning');
      return;
    }

    const langs = this.getLANGUAGES();

    const payload = {
      app: 'MASL – Analizador de Errores Léxicos (Autómatas I)',
      fecha: new Date().toLocaleString(),
      lenguaje: langs[this.currentLanguageId]?.name || this.currentLanguageId,
      resumen: {
        totalTokens: this.analysisResult.stats.totalTokens,
        totalErrores: this.analysisResult.stats.totalErrors,
        sinErroresLexicos: this.analysisResult.errors.length === 0,
        tiempoEscaneoMs: this.analysisResult.stats.scanTimeMs,
        lineasCodigo: this.analysisResult.stats.linesCount
      },
      advertenciaSintactica: this.analysisResult.syntacticHint ? this.analysisResult.syntacticHint.message : null,
      errores: this.analysisResult.errors.map(e => ({
        id: e.id,
        tipo: e.type,
        lexema: e.lexeme,
        linea: e.line,
        columna: e.column,
        explicacion: e.explanation
      })),
      tokens: this.analysisResult.tokens.map(t => ({
        id: t.id,
        categoria: t.type,
        lexema: t.lexeme,
        linea: t.line,
        columna: t.column
      }))
    };

    if (format === 'json') {
      const jsonStr = JSON.stringify(payload, null, 2);
      navigator.clipboard.writeText(jsonStr).then(() => {
        this.showToast('Reporte en JSON copiado al portapapeles', 'success');
      });
    } else if (format === 'text') {
      const textReport = this.generateTextReport(payload);
      navigator.clipboard.writeText(textReport).then(() => {
        this.showToast('Reporte en texto copiado al portapapeles', 'success');
      });
    } else if (format === 'download') {
      const textReport = this.generateTextReport(payload);
      const blob = new Blob([textReport], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MASL_Reporte_Lexico_${this.currentLanguageId}_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Reporte descargado correctamente', 'success');
    }
  }

  generateTextReport(p) {
    let out = `==========================================================\n`;
    out += `  MASL – ANALIZADOR DE ERRORES LÉXICOS (AUTÓMATAS I)\n`;
    out += `==========================================================\n`;
    out += `Fecha: ${p.fecha}\n`;
    out += `Lenguaje: ${p.lenguaje}\n`;
    out += `Estado: ${p.resumen.sinErroresLexicos ? 'SIN ERRORES LÉXICOS (VÁLIDO)' : `${p.resumen.totalErrores} ERRORES LÉXICOS DETECTADOS`}\n`;
    out += `Total de Tokens: ${p.resumen.totalTokens}\n`;
    out += `Líneas Analizadas: ${p.resumen.lineasCodigo}\n`;
    out += `Tiempo de Escaneo: ${p.resumen.tiempoEscaneoMs} ms\n\n`;

    if (p.advertenciaSintactica) {
      out += `[NOTA DIDÁCTICA SINTÁCTICA]\n`;
      out += `${p.advertenciaSintactica}\n\n`;
    }

    out += `----------------------------------------------------------\n`;
    out += `ERRORES LÉXICOS ENCONTRADOS (${p.errores.length}):\n`;
    out += `----------------------------------------------------------\n`;
    if (p.errores.length === 0) {
      out += `No se encontraron errores léxicos.\n`;
    } else {
      p.errores.forEach((e, i) => {
        out += `${i + 1}. [${e.tipo}] Lexema: "${e.lexema}" | Línea: ${e.linea}, Columna: ${e.columna}\n`;
        out += `   Explicación: ${e.explicacion}\n\n`;
      });
    }

    out += `----------------------------------------------------------\n`;
    out += `LISTA DE TOKENS (${p.tokens.length}):\n`;
    out += `----------------------------------------------------------\n`;
    out += ` # | Lexema              | Categoría            | Línea | Col\n`;
    out += `---+---------------------+----------------------+-------+----\n`;
    p.tokens.forEach(t => {
      const lex = t.lexema.length > 18 ? t.lexema.substring(0, 15) + '...' : t.lexema.padEnd(19);
      const cat = t.categoria.padEnd(20);
      out += ` ${String(t.id).padStart(2)} | ${lex} | ${cat} | ${String(t.linea).padStart(5)} | ${String(t.columna).padStart(3)}\n`;
    });

    return out;
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `masl-toast toast-${type} animate-fade-in`;
    const icon = type === 'success'
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  formatCategoryName(type) {
    const map = {
      PALABRA_RESERVADA: 'Palabra Reservada',
      IDENTIFICADOR: 'Identificador',
      NUMERO_ENTERO: 'Número Entero',
      NUMERO_DECIMAL: 'Número Decimal',
      NUMERO_HEXADECIMAL: 'Número Hexadecimal',
      CADENA: 'Cadena Literal',
      CARACTER: 'Carácter Literal',
      OPERADOR: 'Operador',
      DELIMITADOR: 'Delimitador',
      COMENTARIO: 'Comentario',
      DIRECTIVA_PREPROCESADOR: 'Directiva Preprocesador',
      ERROR: 'Error Léxico'
    };
    return map[type] || type;
  }

  formatErrorTypeName(type) {
    const map = {
      SIMBOLO_NO_PERMITIDO: 'Símbolo no permitido (Fuera de Σ)',
      IDENTIFICADOR_MAL_FORMADO: 'Identificador mal formado',
      NUMERO_MAL_FORMADO: 'Número mal formado',
      CADENA_SIN_CERRAR: 'Cadena literal sin cerrar',
      CARACTER_MAL_FORMADO: 'Literal de carácter mal formado',
      COMENTARIO_SIN_CERRAR: 'Comentario de bloque sin cerrar'
    };
    return map[type] || type;
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
  window.MASL.MaslApp = MaslApp;

  document.addEventListener('DOMContentLoaded', () => {
    window.maslApp = new MaslApp();
  });
}