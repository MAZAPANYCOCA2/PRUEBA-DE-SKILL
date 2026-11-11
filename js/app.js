/* Controlador de la interfaz: pestañas, modos, teclado, historial, tema e IA. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };
  const state = { tab: 'algebra', mode: { algebra: 'ecuacion', calculo: 'derivada', quimica: 'balancear' } };

  /* ---------- Tema ---------- */
  const theme = store.get('ecuo.theme', null);
  if (theme) document.documentElement.dataset.theme = theme;
  $('#btn-theme').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    store.set('ecuo.theme', document.documentElement.dataset.theme);
  });

  /* ---------- Pestañas y modos ---------- */
  function setTab(tab) {
    state.tab = tab;
    $$('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    $$('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tab));
    if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
  }
  $$('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

  function setMode(group, mode) {
    state.mode[group] = mode;
    $$('.modes[data-group="' + group + '"] .mode').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    ({ algebra: configAlgebra, calculo: configCalc, quimica: configChem })[group]();
  }
  $$('.modes').forEach(m => m.addEventListener('click', e => { const b = e.target.closest('.mode'); if (b) setMode(m.dataset.group, b.dataset.mode); }));

  /* ---------- Teclado matemático ---------- */
  const KEYS = [['x', 'x'], ['y', 'y'], ['^', '^'], ['√', 'sqrt()'], ['(', '('], [')', ')'], ['/', '/'], ['·', '*'], ['π', 'pi'], ['e', 'e'], ['sin', 'sin()'], ['cos', 'cos()'], ['tan', 'tan()'], ['ln', 'log()'], ['|x|', 'abs()'], ['=', '=']];
  $$('.keypad').forEach(kp => {
    const target = $('#' + kp.dataset.target);
    kp.innerHTML = KEYS.map(([l, v]) => '<button type="button" data-v="' + UI.esc(v) + '">' + UI.esc(l) + '</button>').join('');
    kp.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.dataset.v, s = target.selectionStart, en = target.selectionEnd;
      target.value = target.value.slice(0, s) + v + target.value.slice(en);
      const pos = s + (v.endsWith('()') ? v.length - 1 : v.length);
      target.focus(); target.setSelectionRange(pos, pos); target.dispatchEvent(new Event('input'));
    });
  });

  function examples(el, list, input, run) {
    el.innerHTML = list.map(x => '<button class="chip" type="button">' + UI.esc(x) + '</button>').join('');
    el.onclick = e => { const b = e.target.closest('.chip'); if (!b) return; input.value = b.textContent; input.dispatchEvent(new Event('input')); run(); };
  }
  const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  function safe(out, fn) {
    try { fn(); } catch (e) { out.innerHTML = UI.error(friendly(e)); console.warn(e); }
  }
  function friendly(e) {
    const m = (e && e.message) || String(e);
    if (/Unexpected|Parenthesis|Syntax|Undefined symbol|Value expected|Unterminated|is not a valid/i.test(m)) return 'No entendí la expresión. Revisa paréntesis y operadores (usa * para multiplicar y ^ para potencias). Detalle: ' + m;
    return m;
  }

  /* ---------- Historial ---------- */
  function addHistory(item) {
    const h = store.get('ecuo.history', []).filter(x => !(x.tab === item.tab && x.mode === item.mode && x.input === item.input));
    h.unshift({ ...item, t: Date.now() });
    store.set('ecuo.history', h.slice(0, 50));
  }
  const MODE_NAMES = { ecuacion: 'Ecuación', sistema: 'Sistema', factorizar: 'Factorizar', simplificar: 'Simplificar', expandir: 'Expandir', derivada: 'Derivada', integral: 'Integral', limite: 'Límite', grafica: 'Gráfica', balancear: 'Balancear', masa: 'Masa molar', esteq: 'Estequiometría' };
  $('#btn-history').addEventListener('click', () => {
    const h = store.get('ecuo.history', []);
    $('#history-list').innerHTML = h.length ? h.map((x, i) => '<li data-i="' + i + '">' + UI.esc(x.input) + '<small>' + MODE_NAMES[x.mode] + ' · ' + new Date(x.t).toLocaleString() + '</small></li>').join('') : '<li>Aún no hay nada aquí.</li>';
    $('#dlg-history').showModal();
  });
  $('#history-list').addEventListener('click', e => {
    const li = e.target.closest('li[data-i]'); if (!li) return;
    const x = store.get('ecuo.history', [])[+li.dataset.i];
    $('#dlg-history').close();
    setTab(x.tab); setMode(x.tab, x.mode);
    const input = { algebra: '#alg-input', calculo: '#calc-input', quimica: '#chem-input' }[x.tab];
    $(input).value = x.input;
    if (x.extra) for (const k in x.extra) { const el = $('#' + k); if (el) { if (el.type === 'checkbox') el.checked = x.extra[k]; else el.value = x.extra[k]; } }
    $(input).dispatchEvent(new Event('input'));
    ({ algebra: runAlgebra, calculo: runCalc, quimica: runChem })[x.tab]();
  });
  $('#history-clear').addEventListener('click', () => { store.set('ecuo.history', []); $('#history-list').innerHTML = '<li>Aún no hay nada aquí.</li>'; });
  $$('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

  /* ---------- Álgebra ---------- */
  const algIn = $('#alg-input'), algOut = $('#alg-result');
  const ALG_CFG = {
    ecuacion: ['Escribe la ecuación', '2x^2 - 3x - 5 = 0', ['3x + 7 = 22', 'x^2 - 5x + 6 = 0', 'x^2 + 2x + 5 = 0', 'x^3 - 6x^2 + 11x - 6 = 0', '(x+1)/2 = x - 3', 'sin(x) = 0.5']],
    sistema: ['Una ecuación por línea', 'x + y = 10\nx - y = 2', ['x + y = 10; x - y = 2', '2x + 3y - z = 1; x - y + 2z = 5; 3x + y + z = 8', 'x^2 + y = 7; x - y = -1']],
    factorizar: ['Expresión a factorizar', 'x^2 - 9', ['x^2 - 9', 'x^3 - 8', '6x^2 + 11x - 10', 'x^4 - 5x^2 + 4']],
    simplificar: ['Expresión a simplificar', '(x^2 - 1)/(x - 1)', ['(x^2 - 1)/(x - 1)', '(x^2+5x+6)/(x+3)', 'sin(x)^2 + cos(x)^2', '2x + 3x - x^2 + 4x^2']],
    expandir: ['Expresión a expandir', '(x + 2)^3', ['(x + 2)^3', '(2x - 3)(x + 5)', '(a + b)^2', '(x-1)(x+1)(x^2+1)']]
  };
  function configAlgebra() {
    const [lbl, ph, ex] = ALG_CFG[state.mode.algebra];
    $('#alg-label').textContent = lbl; algIn.placeholder = ph; algIn.rows = state.mode.algebra === 'sistema' ? 3 : 2;
    examples($('#alg-examples'), ex, algIn, runAlgebra);
    algOut.innerHTML = ''; algPreview();
  }
  const algPreview = debounce(() => { try { $('#alg-preview').innerHTML = ALG.preview(algIn.value, state.mode.algebra); } catch (e) { $('#alg-preview').innerHTML = ''; } });
  algIn.addEventListener('input', algPreview);
  function runAlgebra() {
    const mode = state.mode.algebra, v = algIn.value;
    safe(algOut, () => {
      const r = mode === 'ecuacion' ? ALG.solveEquation(v) : mode === 'sistema' ? ALG.solveSystem(v) : ALG.transform(v, mode);
      algOut.innerHTML = UI.answer(r);
      addHistory({ tab: 'algebra', mode, input: v });
      if (mode === 'ecuacion') {
        // Gráfica de lado izquierdo − lado derecho para ver las raíces.
        try {
          const [l, rr] = ALG.normalize(v).split('=');
          const expr = '(' + l + ')-(' + (rr || '0') + ')';
          const vars = nerdamer(expr).variables();
          if (vars.length === 1) CALC.renderPlot(algOut, { f: nerdamer(expr).toString(), v: vars[0] });
        } catch (e) { /* sin gráfica */ }
      }
    });
  }
  $('#alg-go').addEventListener('click', runAlgebra);

  /* ---------- Cálculo ---------- */
  const calcIn = $('#calc-input'), calcOut = $('#calc-result'), calcExtra = $('#calc-extra');
  const CALC_EX = {
    derivada: ['x^3 - 4x + 7', 'x^2*sin(x)', 'log(x)/x', 'e^(3x^2)', 'sqrt(1 + x^2)', 'tan(x)*cos(x)^2'],
    integral: ['3x^2 + 2x', 'x*e^x', 'sin(x)^2', '1/(1+x^2)', 'x*log(x)', 'cos(3x)'],
    limite: ['sin(x)/x', '(x^2-4)/(x-2)', '(1+1/x)^x', '(1-cos(x))/x^2', '(3x^2+1)/(x^2-5)'],
    grafica: ['x^3 - 3x', 'sin(x)/x', 'e^(-x^2)', 'tan(x)', 'abs(x-2) - 1']
  };
  function configCalc() {
    const m = state.mode.calculo;
    const extra = {
      derivada: '<label><input type="checkbox" id="c-plot" checked> Mostrar gráfica de f y f\'</label>',
      integral: '<label><input type="checkbox" id="c-def"> Definida</label><label>de <input id="c-a" value="0"></label><label>a <input id="c-b" value="1"></label>',
      limite: '<label>' + 'cuando x → <input id="c-p" value="0" title="Número, inf o -inf"></label>',
      grafica: '<label>x mín <input id="c-xmin" value="-10"></label><label>x máx <input id="c-xmax" value="10"></label><label><input type="checkbox" id="c-der"> Incluir derivada</label>'
    }[m];
    calcExtra.innerHTML = extra;
    if (m === 'limite') { const auto = { 'sin(x)/x': '0', '(x^2-4)/(x-2)': '2', '(1+1/x)^x': 'inf', '(1-cos(x))/x^2': '0', '(3x^2+1)/(x^2-5)': 'inf' }; examples($('#calc-examples'), CALC_EX.limite, calcIn, () => { $('#c-p').value = auto[calcIn.value] || '0'; runCalc(); }); }
    else if (m === 'integral') { examples($('#calc-examples'), CALC_EX.integral, calcIn, runCalc); }
    else examples($('#calc-examples'), CALC_EX[m], calcIn, runCalc);
    $('#calc-go').textContent = m === 'grafica' ? 'Graficar' : 'Resolver';
    calcOut.innerHTML = ''; calcPreview();
  }
  const calcPreview = debounce(() => { $('#calc-preview').innerHTML = CALC.preview(calcIn.value); });
  calcIn.addEventListener('input', calcPreview);
  function runCalc() {
    const m = state.mode.calculo, v = calcIn.value;
    safe(calcOut, () => {
      let out, extra = {};
      if (m === 'derivada') { out = CALC.derivative(v); extra = { 'c-plot': $('#c-plot').checked }; }
      if (m === 'integral') { extra = { 'c-def': $('#c-def').checked, 'c-a': $('#c-a').value, 'c-b': $('#c-b').value }; out = CALC.integral(v, { definite: extra['c-def'], a: extra['c-a'], b: extra['c-b'] }); }
      if (m === 'limite') { extra = { 'c-p': $('#c-p').value }; out = CALC.limit(v, extra['c-p']); }
      if (m === 'grafica') {
        const { s, v: x } = CALC.prep(v);
        extra = { 'c-xmin': $('#c-xmin').value, 'c-xmax': $('#c-xmax').value, 'c-der': $('#c-der').checked };
        const xmin = parseFloat(extra['c-xmin']), xmax = parseFloat(extra['c-xmax']);
        if (!(xmin < xmax)) throw new Error('x mín debe ser menor que x máx.');
        calcOut.innerHTML = '';
        const p = { f: s, v: x }; if (extra['c-der']) p.df = nerdamer.diff(s, x).toString();
        CALC.renderPlot(calcOut, p, { xmin, xmax });
        addHistory({ tab: 'calculo', mode: m, input: v, extra });
        return;
      }
      calcOut.innerHTML = UI.answer(out.result);
      if (m !== 'derivada' || extra['c-plot']) CALC.renderPlot(calcOut, out.plot);
      addHistory({ tab: 'calculo', mode: m, input: v, extra });
    });
  }
  $('#calc-go').addEventListener('click', runCalc);

  /* ---------- Química ---------- */
  const chemIn = $('#chem-input'), chemOut = $('#chem-result');
  const CHEM_CFG = {
    balancear: ['Ecuación química', 'C3H8 + O2 -> CO2 + H2O', ['H2 + O2 -> H2O', 'Fe + O2 -> Fe2O3', 'C6H12O6 + O2 -> CO2 + H2O', 'KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2', 'Cu + HNO3 -> Cu(NO3)2 + NO + H2O', 'MnO4^- + Fe^2+ + H^+ -> Mn^2+ + Fe^3+ + H2O']],
    masa: ['Fórmula química', 'Ca(OH)2', ['H2O', 'C6H12O6', 'Ca3(PO4)2', 'CuSO4*5H2O', 'K4[Fe(CN)6]', 'NaHCO3']],
    esteq: ['Ecuación química (se balancea sola)', 'N2 + H2 -> NH3', ['N2 + H2 -> NH3', 'CH4 + O2 -> CO2 + H2O', 'Al + HCl -> AlCl3 + H2', 'Fe2O3 + CO -> Fe + CO2']]
  };
  function configChem() {
    const m = state.mode.quimica;
    chemOut.innerHTML = '';
    $('#chem-form').hidden = m === 'tabla';
    if (m === 'tabla') { renderTable(); return; }
    const [lbl, ph, ex] = CHEM_CFG[m];
    $('#chem-label').textContent = lbl; chemIn.placeholder = ph;
    $('#chem-hint').hidden = m === 'masa' ? false : false;
    $('#chem-hint').innerHTML = m === 'masa' ? 'Respeta mayúsculas: <code>Co</code> (cobalto) ≠ <code>CO</code>. Hidratos: <code>CuSO4*5H2O</code>. Corchetes y paréntesis permitidos.' : 'Separa reactivos y productos con <code>-&gt;</code> o <code>=</code>. Iones: <code>Fe^3+</code>, electrones: <code>e^-</code>. Hidratos: <code>CuSO4*5H2O</code>.';
    examples($('#chem-examples'), ex, chemIn, runChem);
  }
  const fx = (x, d = 4) => (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('es', { maximumFractionDigits: d });

  function runChem() {
    const m = state.mode.quimica, v = chemIn.value.trim();
    safe(chemOut, () => {
      if (!v) throw new Error('Escribe una fórmula o una ecuación.');
      if (m === 'balancear') {
        const b = CHEM.balance(v);
        chemOut.innerHTML = UI.answer({ title: 'Ecuación balanceada', final: '<div style="font-size:1.25rem">' + b.html + '</div>', steps: b.steps });
      }
      if (m === 'masa') {
        const r = CHEM.molarMass(v);
        let t = '<table class="data"><tr><th>Elemento</th><th>Átomos</th><th>Masa atómica</th><th>Subtotal (g/mol)</th><th>% en masa</th></tr>';
        r.rows.forEach(x => { t += '<tr><td>' + x.sym + ' · ' + ELEMENTS.bySym[x.sym].name + '</td><td>' + x.n + '</td><td>' + fx(x.mass) + '</td><td>' + fx(x.sub) + '</td><td>' + fx(x.pct, 2) + ' %</td></tr>'; });
        t += '</table>';
        chemOut.innerHTML = UI.answer({
          title: 'Masa molar', final: CHEM.pretty(v) + ' = <strong>' + fx(r.M) + ' g/mol</strong>',
          steps: [
            { why: 'Contamos los átomos de cada elemento y multiplicamos por su masa atómica:', html: t },
            { why: 'Sumamos los subtotales:', html: UI.tex('M = ' + r.rows.map(x => x.n + '(' + fx(x.mass) + ')').join(' + ') + ' = ' + fx(r.M) + '\\ \\text{g/mol}') }
          ]
        });
      }
      if (m === 'esteq') renderStoich(v);
      addHistory({ tab: 'quimica', mode: m, input: v });
    });
  }
  $('#chem-go').addEventListener('click', runChem);
  chemIn.addEventListener('keydown', e => { if (e.key === 'Enter') runChem(); });

  function renderStoich(eq) {
    const b = CHEM.balance(eq);
    const Ms = b.species.map(s => { try { return CHEM.molarMass(s).M; } catch (e) { return NaN; } });
    const nR = b.react.length;
    let t = '<table class="data" id="st-table"><tr><th>Especie</th><th>Coef.</th><th>M (g/mol)</th><th>Dato (g)</th><th>Moles</th><th>Masa (g)</th></tr>';
    b.species.forEach((s, i) => {
      t += '<tr><td>' + CHEM.pretty(s) + (i < nR ? '' : ' <small>(producto)</small>') + '</td><td>' + b.coef[i] + '</td><td>' + fx(Ms[i]) + '</td>' +
        '<td><input type="number" min="0" step="any" data-i="' + i + '" placeholder="—" inputmode="decimal"></td><td data-n="' + i + '">—</td><td data-m="' + i + '">—</td></tr>';
    });
    t += '</table><p class="note" id="st-msg">Escribe la masa en gramos de uno o más reactivos (o de un producto deseado). Si das varios reactivos, se detecta el reactivo limitante.</p>';
    chemOut.innerHTML = UI.answer({ title: 'Estequiometría', final: '<div style="font-size:1.15rem">' + b.html + '</div>', extraHTML: t, steps: b.steps });
    const table = $('#st-table');
    table.addEventListener('input', () => {
      const given = $$('input[data-i]', table).map(i => ({ i: +i.dataset.i, g: parseFloat(i.value) })).filter(x => isFinite(x.g) && x.g > 0);
      const msg = $('#st-msg');
      $$('[data-n],[data-m]', table).forEach(td => { td.textContent = '—'; });
      if (!given.length) return;
      // Avance de reacción ξ: el menor n/coef entre los datos de reactivos; si solo hay producto, se usa ese.
      const reactGiven = given.filter(x => x.i < nR);
      const basis = (reactGiven.length ? reactGiven : given).map(x => ({ ...x, xi: x.g / Ms[x.i] / b.coef[x.i] }));
      basis.sort((a, c) => a.xi - c.xi);
      const xi = basis[0].xi;
      b.species.forEach((_, i) => {
        const n = b.coef[i] * xi;
        $('[data-n="' + i + '"]', table).textContent = fx(n, 5);
        $('[data-m="' + i + '"]', table).textContent = fx(n * Ms[i], 4);
      });
      let text = '';
      if (reactGiven.length > 1) {
        text = 'Reactivo limitante: ' + b.species[basis[0].i] + '. ';
        text += reactGiven.filter(x => x.i !== basis[0].i).map(x => 'Sobran ' + fx(x.g - b.coef[x.i] * xi * Ms[x.i], 4) + ' g de ' + b.species[x.i]).join('; ') + '.';
      } else if (reactGiven.length === 1) {
        text = 'Cálculo a partir de ' + fx(given[0].g) + ' g de ' + b.species[reactGiven[0].i] + ' (se supone exceso de los demás reactivos). Masas para la reacción completa.';
      } else {
        text = 'Masas de reactivos necesarias para obtener ' + fx(given[0].g) + ' g de ' + b.species[given[0].i] + '.';
      }
      msg.textContent = text + ' Fórmula: moles = masa / M; moles de cada especie = coeficiente × (moles del dato / su coeficiente).';
    });
  }

  function renderTable() {
    const els = ELEMENTS.list;
    let h = '<div class="answer"><h3>Tabla periódica</h3><div class="ptable">';
    for (const e of els) {
      let row = e.period, col = e.group;
      if (e.cls === 'lantanido') { row = 9; col = 3 + (e.z - 57); }
      if (e.cls === 'actinido') { row = 10; col = 3 + (e.z - 89); }
      h += '<button class="el c-' + e.cls + '" style="grid-row:' + row + ';grid-column:' + col + '" data-z="' + e.z + '" title="' + e.name + '">' + e.sym + '</button>';
    }
    h += '<div class="gap-row" style="grid-row:8"></div></div><div class="el-info" id="el-info"><p class="note">Toca un elemento para ver sus datos.</p></div></div>';
    chemOut.innerHTML = h;
    $('.ptable', chemOut).addEventListener('click', e => {
      const b = e.target.closest('.el'); if (!b) return;
      $$('.el.sel', chemOut).forEach(x => x.classList.remove('sel')); b.classList.add('sel');
      const el = els[+b.dataset.z - 1];
      $('#el-info').innerHTML = '<table class="data"><tr><th>Elemento</th><td><strong>' + el.name + '</strong> (' + el.sym + ')</td></tr><tr><th>Número atómico</th><td>' + el.z + '</td></tr><tr><th>Masa atómica</th><td>' + el.mass + ' u</td></tr><tr><th>Grupo / periodo</th><td>' + (el.group || '—') + ' / ' + el.period + '</td></tr><tr><th>Categoría</th><td>' + el.catName + '</td></tr></table>';
    });
  }

  /* ---------- IA ---------- */
  let image = null;
  const drop = $('#ia-drop'), file = $('#ia-file'), thumb = $('#ia-thumb'), clearBtn = $('#ia-clear-img');
  async function setImage(f) {
    try { image = await IA.shrinkImage(f); thumb.src = image; thumb.hidden = false; clearBtn.hidden = false; }
    catch (e) { $('#ia-result').innerHTML = UI.error(e.message); }
  }
  drop.addEventListener('click', e => { if (e.target !== clearBtn) file.click(); });
  file.addEventListener('change', () => { if (file.files[0]) setImage(file.files[0]); file.value = ''; });
  clearBtn.addEventListener('click', e => { e.stopPropagation(); image = null; thumb.hidden = true; clearBtn.hidden = true; });
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) setImage(f); });
  document.addEventListener('paste', e => {
    if (state.tab !== 'ia') return;
    const it = [...(e.clipboardData || {}).items || []].find(i => i.type.startsWith('image/'));
    if (it) setImage(it.getAsFile());
  });

  const dlg = $('#dlg-ia');
  function openSettings() {
    const c = IA.load();
    $('#ia-provider').value = c.provider; $('#ia-model').value = c.model || IA.DEFAULT_MODEL[c.provider]; $('#ia-key').value = c.key || '';
    dlg.showModal();
  }
  $('#ia-settings').addEventListener('click', openSettings);
  $('#ia-provider').addEventListener('change', e => { $('#ia-model').value = IA.DEFAULT_MODEL[e.target.value]; });
  $('#ia-save').addEventListener('click', () => { IA.save({ provider: $('#ia-provider').value, model: $('#ia-model').value.trim(), key: $('#ia-key').value.trim() }); });
  $('#ia-forget').addEventListener('click', () => { const c = IA.load(); c.key = ''; IA.save(c); $('#ia-key').value = ''; });

  $('#ia-go').addEventListener('click', async () => {
    const out = $('#ia-result'), btn = $('#ia-go');
    if (!IA.load().key) { openSettings(); return; }
    btn.disabled = true;
    out.innerHTML = '<div class="answer"><span class="spinner"></span>Resolviendo…</div>';
    try {
      const text = await IA.ask({ text: $('#ia-input').value.trim(), image, subject: $('#ia-subject').value });
      out.innerHTML = '<div class="answer md"><h3>Solución (IA)</h3>' + UI.markdown(text) + '<p class="note">Respuesta generada por IA: puede contener errores. Puedes comprobar ecuaciones y resultados con las pestañas de Álgebra, Cálculo y Química.</p></div>';
    } catch (e) {
      out.innerHTML = UI.error(e.message === 'Failed to fetch' ? 'No se pudo conectar con el proveedor. Revisa tu conexión.' : e.message);
    } finally { btn.disabled = false; }
  });

  /* ---------- Atajos e inicio ---------- */
  [[algIn, runAlgebra], [calcIn, runCalc]].forEach(([el, fn]) => el.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || (!e.shiftKey && !(el === algIn && state.mode.algebra === 'sistema')))) { e.preventDefault(); fn(); }
  }));
  configAlgebra(); configCalc(); configChem();
  const initial = location.hash.slice(1);
  if (['algebra', 'calculo', 'quimica', 'ia'].indexOf(initial) !== -1) setTab(initial);
})();
