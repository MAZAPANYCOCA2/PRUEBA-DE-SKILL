/* Motor de cálculo: derivadas e integrales con pasos, límites y gráficas. */
(function () {
  'use strict';
  const N = window.nerdamer;
  const { normalize, pickVar, numeric, round } = window.ALG;

  function prep(src) {
    const s = normalize(src).replace(/^\s*[fgy]\s*\(\s*\w\s*\)\s*=\s*/, '').replace(/^\s*y\s*=\s*/, '');
    if (!s) throw new Error('Escribe una función.');
    if (s.indexOf('=') !== -1) throw new Error('Escribe solo la función, sin "=" (por ejemplo: x^2*sin(x)).');
    const node = math.parse(s);                 // valida la sintaxis
    const vars = N(s).variables();
    const v = pickVar(vars) || 'x';
    return { s, node, v };
  }
  const nstr = node => node.toString({ implicit: 'show', parenthesis: 'auto' });
  const T = s => N(s).toTeX();
  const dependsOn = (node, v) => node.filter(n => n.isSymbolNode && n.name === v).length > 0;

  /** Lista los términos de una suma/resta conservando el signo. */
  function terms(node) {
    if (node.isParenthesisNode) return terms(node.content);
    if (node.isOperatorNode && (node.op === '+' || node.op === '-') && node.args.length === 2) {
      const right = terms(node.args[1]).map(t => node.op === '-' ? { sign: -t.sign, node: t.node } : t);
      return terms(node.args[0]).concat(right);
    }
    if (node.isOperatorNode && node.fn === 'unaryMinus') return terms(node.args[0]).map(t => ({ sign: -t.sign, node: t.node }));
    return [{ sign: 1, node }];
  }

  /** Identifica la regla de derivación que aplica a un término. */
  function ruleFor(node, v) {
    const n = node.isParenthesisNode ? node.content : node;
    if (!dependsOn(n, v)) return ['Constante', '\\frac{d}{d' + v + '}c = 0'];
    if (n.isSymbolNode) return ['Variable', '\\frac{d}{d' + v + '}' + v + ' = 1'];
    if (n.isOperatorNode && n.op === '*') {
      const dep = n.args.filter(a => dependsOn(a, v));
      if (dep.length === 1) return ['Constante por función', '(c\\,f)\' = c\\,f\''];
      return ['Regla del producto', '(f\\,g)\' = f\'\\,g + f\\,g\''];
    }
    if (n.isOperatorNode && n.op === '/') {
      if (!dependsOn(n.args[1], v)) return ['Constante por función', '\\left(\\frac{f}{c}\\right)\' = \\frac{f\'}{c}'];
      return ['Regla del cociente', '\\left(\\frac{f}{g}\\right)\' = \\frac{f\'\\,g - f\\,g\'}{g^2}'];
    }
    if (n.isOperatorNode && n.op === '^') {
      const [b, e] = n.args;
      if (!dependsOn(e, v)) {
        const inner = b.isParenthesisNode ? b.content : b;
        return inner.isSymbolNode ? ['Regla de la potencia', '(' + v + '^n)\' = n\\,' + v + '^{n-1}'] : ['Potencia + regla de la cadena', '(u^n)\' = n\\,u^{n-1}\\,u\''];
      }
      if (!dependsOn(b, v)) return ['Exponencial', '(a^{u})\' = a^{u}\\ln(a)\\,u\''];
      return ['Derivación logarítmica', '(f^{g})\' = f^{g}\\left(g\'\\ln f + \\frac{g\\,f\'}{f}\\right)'];
    }
    if (n.isFunctionNode) {
      const name = n.fn.name, arg = n.args[0];
      const basic = { sin: '\\cos u', cos: '-\\sin u', tan: '\\sec^2 u', log: '\\frac{1}{u}', exp: 'e^{u}', sqrt: '\\frac{1}{2\\sqrt{u}}', asin: '\\frac{1}{\\sqrt{1-u^2}}', acos: '-\\frac{1}{\\sqrt{1-u^2}}', atan: '\\frac{1}{1+u^2}', sinh: '\\cosh u', cosh: '\\sinh u' };
      const fname = name === 'log' ? '\\ln' : '\\' + name;
      const chain = arg && !(arg.isSymbolNode && arg.name === v);
      const f = basic[name] ? fname + '(u)\' = ' + basic[name] + (chain ? '\\cdot u\'' : '') : '';
      return [chain ? 'Regla de la cadena (' + name + ')' : 'Derivada de ' + name, f.replace(/u/g, chain ? 'u' : v)];
    }
    return ['Derivación', ''];
  }

  function derivative(src) {
    const { s, node, v } = prep(src);
    const steps = [{ why: 'Función a derivar respecto de ' + v + ':', tex: 'f(' + v + ') = ' + T(s) }];
    const ts = terms(node);
    if (ts.length > 1) steps.push({ why: 'La derivada de una suma es la suma de las derivadas (linealidad). Derivamos término a término.' });
    const parts = [];
    for (const t of ts) {
      const ts_ = nstr(t.node);
      const [rule, formula] = ruleFor(t.node, v);
      const d = N.diff(ts_, v);
      parts.push((t.sign < 0 ? '-(' : '(') + d.toString() + ')');
      steps.push({ why: rule + (formula ? ':' : ''), tex: (formula ? formula + '\\qquad ' : '') + '\\frac{d}{d' + v + '}\\left[' + T(ts_) + '\\right] = ' + d.toTeX() });
    }
    let res = N.diff(s, v);
    try { const simp = N('simplify(' + res + ')'); if (simp.toString().length <= res.toString().length) res = simp; } catch (e) { /* conservar */ }
    if (ts.length > 1) steps.push({ why: 'Sumamos los resultados y simplificamos:', tex: 'f\'(' + v + ') = ' + res.toTeX() });
    return { result: { title: 'Derivada', final: UI.tex('f\'(' + v + ') = ' + res.toTeX(), true), steps }, plot: { f: s, df: res.toString(), v } };
  }

  /** Integral numérica por Simpson adaptativo (respaldo si no hay primitiva). */
  function simpson(f, a, b) {
    const sim = (a, b, fa, fm, fb) => (b - a) / 6 * (fa + 4 * fm + fb);
    function rec(a, b, fa, fm, fb, whole, eps, depth) {
      const m = (a + b) / 2, lm = (a + m) / 2, rm = (m + b) / 2;
      const flm = f(lm), frm = f(rm);
      const left = sim(a, m, fa, flm, fm), right = sim(m, b, fm, frm, fb);
      if (depth <= 0 || Math.abs(left + right - whole) <= 15 * eps) return left + right + (left + right - whole) / 15;
      return rec(a, m, fa, flm, fm, left, eps / 2, depth - 1) + rec(m, b, fm, frm, fb, right, eps / 2, depth - 1);
    }
    const fa = f(a), fb = f(b), fm = f((a + b) / 2);
    return rec(a, b, fa, fm, fb, sim(a, b, fa, fm, fb), 1e-10, 40);
  }

  function parseBound(x) {
    const t = normalize(x).toLowerCase();
    if (!t) throw new Error('Indica los límites de integración.');
    if (/^(\+)?(inf|infinity|∞)$/.test(t)) return { s: 'Infinity', n: Infinity, tex: '\\infty' };
    if (/^-(inf|infinity|∞)$/.test(t)) return { s: '-Infinity', n: -Infinity, tex: '-\\infty' };
    const n = numeric(t);
    if (!n || n.im) throw new Error('Límite no válido: ' + x);
    return { s: t, n: n.re, tex: T(t) };
  }

  function integral(src, opts) {
    const { s, node, v } = prep(src);
    const steps = [];
    const ts = terms(node);
    const definite = opts && opts.definite;
    steps.push({ why: 'Integral a calcular:', tex: (definite ? '\\int_{' + opts.a + '}^{' + opts.b + '}' : '\\int ') + T(s) + '\\,d' + v });
    if (ts.length > 1) steps.push({ why: 'La integral de una suma es la suma de las integrales (linealidad). Integramos término a término.' });
    let F = null, failed = false;
    try {
      F = N('integrate(' + s + ',' + v + ')');
      if (/integrate/.test(F.toString())) failed = true;
    } catch (e) { failed = true; }
    if (!failed && ts.length > 1) {
      for (const t of ts) {
        const ts_ = nstr(t.node);
        try {
          const Fi = N('integrate(' + ts_ + ',' + v + ')');
          steps.push({ why: (t.sign < 0 ? 'Término (restando):' : 'Término:'), tex: '\\int ' + T(ts_) + '\\,d' + v + ' = ' + Fi.toTeX() });
        } catch (e) { /* omitido */ }
      }
    }
    if (!definite) {
      if (failed) throw new Error('No se encontró una primitiva en términos de funciones elementales. Prueba la integral definida para obtener un valor numérico.');
      // Comprobación: derivar la primitiva
      steps.push({ why: 'Primitiva (sumamos la constante de integración C):', tex: 'F(' + v + ') = ' + F.toTeX() + ' + C' });
      let ok = false;
      try { const chk = N('simplify(' + N.diff(F.toString(), v) + '-(' + s + '))').toString(); ok = chk === '0' || Math.abs((numeric(N(chk, { [v]: '0.7319' }).evaluate().text('decimals')) || { re: 1 }).re) < 1e-8; } catch (e) { /* sin comprobación */ }
      if (ok) steps.push({ why: 'Comprobación: al derivar F(' + v + ') obtenemos de nuevo la función ✓' });
      return { result: { title: 'Integral indefinida', final: UI.tex('\\int ' + T(s) + '\\,d' + v + ' = ' + F.toTeX() + ' + C', true), steps }, plot: { f: s, v } };
    }
    const a = parseBound(opts.a), b = parseBound(opts.b);
    const f = math.compile(s.replace(/\blog\(/g, 'log(')); // math.js: log = ln
    const fn = x => f.evaluate({ [v]: x, e: Math.E, pi: Math.PI });
    let value = null, how = '';
    if (!failed) {
      const at = bnd => {
        const lim = () => numeric(N('limit(' + F + ',' + v + ',' + bnd.s + ')').evaluate().text('decimals'));
        if (!isFinite(bnd.n)) return lim();
        let r = null;
        try { r = numeric(N(F.toString(), { [v]: bnd.s }).evaluate().text('decimals')); } catch (e) { r = null; }
        return r && isFinite(r.re) ? r : lim(); // p. ej. x·ln(x) en 0: se usa el límite
      };
      try {
        const Fb = at(b), Fa = at(a);
        if (Fb && Fa && isFinite(Fb.re) && isFinite(Fa.re)) {
          steps.push({ why: 'Primitiva:', tex: 'F(' + v + ') = ' + F.toTeX() });
          steps.push({ why: 'Teorema fundamental del cálculo: F(b) − F(a).', tex: 'F(' + b.tex + ') - F(' + a.tex + ') = ' + round(Fb.re, 8) + ' - (' + round(Fa.re, 8) + ')' });
          value = Fb.re - Fa.re; how = 'exacto';
          try {
            const exact = isFinite(a.n) && isFinite(b.n) ? N('(' + F + ')', { [v]: b.s }).subtract(N('(' + F + ')', { [v]: a.s })) : null;
            if (exact && !/\d{9,}/.test(exact.toString())) steps.push({ why: 'Valor exacto:', tex: exact.toTeX() });
          } catch (e) { /* opcional */ }
        }
      } catch (e) { /* respaldo numérico */ }
    }
    if (value === null) {
      if (!isFinite(a.n) || !isFinite(b.n)) throw new Error('No se pudo evaluar la integral impropia.');
      const g = x => { const y = fn(x); return isFinite(y) ? y : fn(x + (x === a.n ? 1e-9 : -1e-9)); }; value = simpson(g, a.n, b.n); how = 'numérico';
      steps.push({ why: 'No hay primitiva elemental; aproximamos con la regla de Simpson adaptativa.' });
    }
    if (!isFinite(value)) throw new Error('La integral diverge o la función no está definida en el intervalo.');
    return {
      result: { title: 'Integral definida', final: UI.tex('\\int_{' + a.tex + '}^{' + b.tex + '} ' + T(s) + '\\,d' + v + (how === 'exacto' ? ' = ' : ' \\approx ') + round(value, 8), true), steps, note: 'El área sombreada en la gráfica representa la integral (las zonas bajo el eje cuentan en negativo).' },
      plot: { f: s, v, shade: isFinite(a.n) && isFinite(b.n) ? [a.n, b.n] : null }
    };
  }

  function limit(src, point) {
    const { s, v } = prep(src);
    const p = parseBound(point || '0');
    const steps = [{ why: 'Límite a calcular:', tex: '\\lim_{' + v + ' \\to ' + p.tex + '} ' + T(s) }];
    const f = math.compile(s);
    const fn = x => { try { const r = f.evaluate({ [v]: x }); return typeof r === 'number' ? r : (r && r.im === 0 ? r.re : NaN); } catch (e) { return NaN; } };
    if (isFinite(p.n)) {
      const direct = fn(p.n);
      if (isFinite(direct)) steps.push({ why: 'Sustitución directa: la función está definida y es continua en ese punto.', tex: 'f(' + p.tex + ') = ' + round(direct, 10) });
      else steps.push({ why: 'Al sustituir directamente se obtiene una forma indeterminada o una división entre cero (0/0, ∞/∞, …). Hay que simplificar o usar la regla de L\'Hôpital.' });
    }
    // Tabla numérica de aproximación
    const rows = [];
    if (isFinite(p.n)) {
      for (const h of [0.1, 0.01, 0.001, 0.0001]) rows.push([p.n - h, fn(p.n - h), p.n + h, fn(p.n + h)]);
    } else {
      for (const X of [10, 100, 1000, 10000]) { const x = p.n > 0 ? X : -X; rows.push([x, fn(x)]); }
    }
    const fmt = x => isFinite(x) ? String(round(x, 6)) : (isNaN(x) ? 'indef.' : (x > 0 ? '∞' : '−∞'));
    let table = '<table class="data"><tr>' + (isFinite(p.n) ? '<th>' + v + ' (izq.)</th><th>f</th><th>' + v + ' (der.)</th><th>f</th>' : '<th>' + v + '</th><th>f(' + v + ')</th>') + '</tr>';
    for (const r of rows) table += '<tr>' + r.map(fmt).map(c => '<td>' + c + '</td>').join('') + '</tr>';
    table += '</table>';
    steps.push({ why: 'Tabla de valores al acercarnos al punto:', html: table });
    let L = null;
    try { L = N('limit(' + s + ',' + v + ',' + p.s + ')'); } catch (e) { L = null; }
    let final;
    if (L && !/limit/.test(L.toString())) {
      const ls = L.toString();
      const lt = ls === 'Infinity' ? '\\infty' : ls === '-Infinity' ? '-\\infty' : L.toTeX();
      final = UI.tex('\\lim_{' + v + ' \\to ' + p.tex + '} ' + T(s) + ' = ' + lt, true);
      steps.push({ why: 'Valor del límite:', tex: lt });
    } else {
      const last = rows[rows.length - 1];
      const l = isFinite(p.n) ? last[1] : last[1], r = isFinite(p.n) ? last[3] : last[1];
      if (isFinite(l) && isFinite(r) && Math.abs(l - r) < 1e-3) final = UI.tex('\\lim_{' + v + ' \\to ' + p.tex + '} ' + T(s) + ' \\approx ' + round((l + r) / 2, 4), true);
      else throw new Error('El límite no existe o no se pudo determinar (los límites laterales no coinciden).');
    }
    return { result: { title: 'Límite', final, steps }, plot: { f: s, v, mark: isFinite(p.n) ? p.n : null } };
  }

  /* ---------- Gráficas en canvas ---------- */
  function Plot(canvas, cfg) {
    const ctx = canvas.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const col = n => css.getPropertyValue(n).trim();
    let view = { x0: cfg.xmin ?? -10, x1: cfg.xmax ?? 10, y0: -6, y1: 6 };
    const fns = cfg.curves.map(c => { const k = math.compile(c.expr); return { ...c, fn: x => { try { const r = k.evaluate({ [cfg.v]: x }); return typeof r === 'number' ? r : (r && Math.abs(r.im) < 1e-12 ? r.re : NaN); } catch (e) { return NaN; } } }; });

    // Ajuste automático del eje Y según la primera curva.
    (function autoY() {
      const ys = [];
      for (let i = 0; i <= 400; i++) { const x = view.x0 + (view.x1 - view.x0) * i / 400; const y = fns[0].fn(x); if (isFinite(y)) ys.push(y); }
      if (!ys.length) return;
      ys.sort((a, b) => a - b);
      let lo = ys[Math.floor(ys.length * 0.03)], hi = ys[Math.ceil(ys.length * 0.97) - 1];
      if (hi - lo < 1e-6) { lo -= 1; hi += 1; }
      const pad = (hi - lo) * 0.15; view.y0 = lo - pad; view.y1 = hi + pad;
      if (view.y0 > 0) view.y0 = -pad; if (view.y1 < 0) view.y1 = pad;
    })();

    function nice(range) { const raw = range / 8, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }

    function draw() {
      const dpr = window.devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const X = x => (x - view.x0) / (view.x1 - view.x0) * W, Y = y => H - (y - view.y0) / (view.y1 - view.y0) * H;
      ctx.clearRect(0, 0, W, H);
      ctx.font = '11px system-ui'; ctx.lineWidth = 1;
      const sx = nice(view.x1 - view.x0), sy = nice(view.y1 - view.y0);
      ctx.strokeStyle = col('--border'); ctx.fillStyle = col('--muted');
      for (let x = Math.ceil(view.x0 / sx) * sx; x <= view.x1; x += sx) { ctx.beginPath(); ctx.moveTo(X(x), 0); ctx.lineTo(X(x), H); ctx.stroke(); if (Math.abs(x) > sx / 2) ctx.fillText(+x.toPrecision(6), X(x) + 2, Math.min(Math.max(Y(0) + 12, 12), H - 3)); }
      for (let y = Math.ceil(view.y0 / sy) * sy; y <= view.y1; y += sy) { ctx.beginPath(); ctx.moveTo(0, Y(y)); ctx.lineTo(W, Y(y)); ctx.stroke(); if (Math.abs(y) > sy / 2) ctx.fillText(+y.toPrecision(6), Math.min(Math.max(X(0) + 3, 3), W - 40), Y(y) - 2); }
      ctx.strokeStyle = col('--muted'); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.moveTo(X(0), 0); ctx.lineTo(X(0), H); ctx.stroke();
      if (cfg.shade) {
        const [a, b] = cfg.shade; ctx.fillStyle = col('--accent-soft'); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(X(a), Y(0));
        for (let i = 0; i <= 300; i++) { const x = a + (b - a) * i / 300, y = fns[0].fn(x); ctx.lineTo(X(x), Y(isFinite(y) ? y : 0)); }
        ctx.lineTo(X(b), Y(0)); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      }
      for (const c of fns) {
        ctx.strokeStyle = c.color; ctx.lineWidth = 2.2; ctx.beginPath();
        let pen = false, prev = null;
        for (let px = 0; px <= W; px += 0.5) {
          const x = view.x0 + (view.x1 - view.x0) * px / W, y = c.fn(x);
          if (!isFinite(y) || (prev !== null && Math.abs(Y(y) - Y(prev)) > H)) { pen = false; prev = isFinite(y) ? y : null; continue; }
          const py = Math.max(-1e4, Math.min(1e4, Y(y)));
          if (pen) ctx.lineTo(px, py); else ctx.moveTo(px, py);
          pen = true; prev = y;
        }
        ctx.stroke();
      }
      if (cfg.mark != null) { ctx.strokeStyle = col('--coral'); ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(X(cfg.mark), 0); ctx.lineTo(X(cfg.mark), H); ctx.stroke(); ctx.setLineDash([]); }
    }

    // Interacción: arrastrar para mover, rueda o botones para zoom.
    let drag = null;
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, v: { ...view } }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
    canvas.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = (e.clientX - drag.x) / canvas.clientWidth * (drag.v.x1 - drag.v.x0), dy = (e.clientY - drag.y) / canvas.clientHeight * (drag.v.y1 - drag.v.y0);
      view = { x0: drag.v.x0 - dx, x1: drag.v.x1 - dx, y0: drag.v.y0 + dy, y1: drag.v.y1 + dy }; draw();
    });
    canvas.addEventListener('pointerup', () => { drag = null; canvas.style.cursor = 'grab'; });
    function zoom(k, cx = 0.5, cy = 0.5) {
      const x = view.x0 + (view.x1 - view.x0) * cx, y = view.y1 - (view.y1 - view.y0) * cy;
      view = { x0: x + (view.x0 - x) * k, x1: x + (view.x1 - x) * k, y0: y + (view.y0 - y) * k, y1: y + (view.y1 - y) * k }; draw();
    }
    canvas.addEventListener('wheel', e => { e.preventDefault(); const r = canvas.getBoundingClientRect(); zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); }, { passive: false });
    new ResizeObserver(draw).observe(canvas);
    draw();
    return { draw, zoom };
  }

  /** Inserta una gráfica con leyenda y controles dentro de un contenedor. */
  function renderPlot(container, p, opts = {}) {
    const css = getComputedStyle(document.documentElement);
    const curves = [{ expr: p.f, color: css.getPropertyValue('--accent').trim(), label: 'f(' + p.v + ')' }];
    if (p.df && opts.withDerivative !== false) curves.push({ expr: p.df, color: css.getPropertyValue('--coral').trim(), label: 'f\'(' + p.v + ')' });
    const wrap = document.createElement('div');
    wrap.className = 'answer';
    wrap.style.marginTop = '12px';
    wrap.innerHTML = '<h3>Gráfica</h3><canvas class="plot" aria-label="Gráfica de la función"></canvas>' +
      '<div class="legend">' + curves.map(c => '<span><i style="background:' + c.color + '"></i>' + UI.esc(c.label) + '</span>').join('') +
      '<span style="margin-left:auto"><button class="chip" data-z="0.7">＋</button> <button class="chip" data-z="1.4">－</button> <button class="chip" data-png>PNG</button></span></div>' +
      '<p class="note">Arrastra para moverte; usa la rueda o los botones para hacer zoom.</p>';
    container.appendChild(wrap);
    const canvas = wrap.querySelector('canvas');
    const plot = Plot(canvas, { curves, v: p.v, shade: p.shade, mark: p.mark, xmin: opts.xmin, xmax: opts.xmax });
    wrap.querySelectorAll('[data-z]').forEach(b => b.addEventListener('click', () => plot.zoom(+b.dataset.z)));
    wrap.querySelector('[data-png]').addEventListener('click', () => {
      const a = document.createElement('a'); a.download = 'grafica-ecuo.png'; a.href = canvas.toDataURL('image/png'); a.click();
    });
  }

  function preview(src) {
    try { const { s, v } = prep(src); return UI.tex('f(' + v + ') = ' + T(s), true); } catch (e) { return ''; }
  }

  window.CALC = { derivative, integral, limit, renderPlot, prep, preview, simpson };
})();
