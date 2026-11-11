/* Motor de álgebra: ecuaciones, sistemas, factorizar, simplificar, expandir.
   Usa nerdamer para el álgebra simbólica y math.js para evaluar numéricamente. */
(function () {
  'use strict';
  const N = window.nerdamer;

  /** Normaliza lo que escribe la gente: símbolos unicode, coma decimal, etc. */
  function normalize(s) {
    return String(s)
      .replace(/[−–—]/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/')
      .replace(/√\s*\(/g, 'sqrt(').replace(/√\s*([\w.]+)/g, 'sqrt($1)')
      .replace(/π/g, 'pi').replace(/²/g, '^2').replace(/³/g, '^3')
      .replace(/(\d),(\d)/g, '$1.$2')
      .replace(/\bsen\(/g, 'sin(').replace(/\bln\(/g, 'log(')
      .replace(/\*\*/g, '^')
      .trim();
  }

  const texOf = e => N(e).toTeX();
  const has = (arr, v) => arr.indexOf(v) !== -1;

  function pickVar(vars) {
    if (!vars.length) return null;
    for (const v of ['x', 'y', 'z', 't', 'n']) if (has(vars, v)) return v;
    return vars[0];
  }

  function splitEq(src) {
    const s = normalize(src);
    if (!s) throw new Error('Escribe algo para resolver.');
    const parts = s.split('=');
    if (parts.length > 2) throw new Error('La ecuación debe tener un solo signo "=".');
    const lhs = parts[0].trim(), rhs = parts.length === 2 ? parts[1].trim() : '0';
    if (!lhs || !rhs) throw new Error('Falta un lado de la ecuación.');
    return [lhs, rhs];
  }

  function numeric(str) {
    try {
      const v = math.evaluate(String(str).replace(/\*\*/g, '^'));
      if (typeof v === 'number') return { re: v, im: 0 };
      if (v && typeof v.re === 'number') return { re: v.re, im: v.im };
    } catch (e) { /* no numérico */ }
    return null;
  }
  const round = (x, d = 8) => { const r = Math.round(x * 10 ** d) / 10 ** d; return Object.is(r, -0) ? 0 : r; };

  /** Muestra una solución: exacta si es legible, aproximada si no. */
  function showSol(v, sol) {
    const s = sol.toString();
    const ugly = /\d{9,}/.test(s);
    const num = numeric(N(s).evaluate().text('decimals'));
    if (!ugly) {
      let h = UI.tex(v + ' = ' + N(s).toTeX());
      if (num && /[a-z]|\//.test(s) && !/i/.test(s)) h += ' <span class="note">≈ ' + round(num.re, 6) + '</span>';
      return h;
    }
    if (!num) return UI.tex(v + ' = ' + N(s).toTeX());
    const re = round(num.re, 6), im = round(num.im, 6);
    const txt = im === 0 ? String(re) : (re === 0 ? '' : re + (im > 0 ? ' + ' : ' - ')) + Math.abs(im) + 'i';
    return UI.tex(v + ' \\approx ' + txt);
  }

  function solveEquation(src) {
    const [lhs, rhs] = splitEq(src);
    const expr = N('(' + lhs + ')-(' + rhs + ')').expand();
    const vars = expr.variables();
    const v = pickVar(vars);
    if (!v) {
      const val = numeric(expr.evaluate().text('decimals'));
      const ok = val && Math.abs(val.re) < 1e-12 && Math.abs(val.im) < 1e-12;
      return { title: 'Comprobación', final: ok ? 'La igualdad es <strong>verdadera</strong>.' : 'La igualdad es <strong>falsa</strong>.', steps: [{ why: 'Restamos ambos lados:', tex: expr.toTeX() + ' = 0' }] };
    }
    const steps = [];
    steps.push({ why: 'Ecuación original:', tex: texOf(lhs) + ' = ' + texOf(rhs) });
    if (rhs !== '0') steps.push({ why: 'Pasamos todo al lado izquierdo y simplificamos:', tex: expr.toTeX() + ' = 0' });

    const others = vars.filter(x => x !== v);
    let deg = null;
    try { if (expr.toString().indexOf('/') === -1 || others.length === 0) deg = Number(N.deg(expr.toString(), v).toString()); } catch (e) { deg = null; }
    const isPoly = deg !== null && Number.isInteger(deg) && deg >= 1 && !/(sin|cos|tan|log|exp|abs|sqrt|\^\(|e\^)/.test(expr.toString());

    if (isPoly && deg === 1) {
      const c = N.coeffs(expr.toString(), v);
      const b = c.symbol.elements[0].toString(), a = c.symbol.elements[1].toString();
      steps.push({ why: 'Es lineal: tiene la forma a·' + v + ' + b = 0, con', tex: 'a = ' + texOf(a) + ',\\quad b = ' + texOf(b) });
      steps.push({ why: 'Despejamos ' + v + ' restando b y dividiendo entre a:', tex: v + ' = \\frac{-(' + texOf(b) + ')}{' + texOf(a) + '}' });
      const sol = N('-(' + b + ')/(' + a + ')');
      steps.push({ why: 'Simplificamos:', tex: v + ' = ' + sol.toTeX() });
      return { title: 'Solución', final: showSol(v, sol), steps };
    }

    if (isPoly && deg === 2) {
      const c = N.coeffs(expr.toString(), v).symbol.elements.map(e => e.toString());
      const [cc, bb, aa] = c;
      steps.push({ why: 'Es cuadrática: a·' + v + '² + b·' + v + ' + c = 0, con', tex: 'a = ' + texOf(aa) + ',\\; b = ' + texOf(bb) + ',\\; c = ' + texOf(cc) });
      const D = N('(' + bb + ')^2-4*(' + aa + ')*(' + cc + ')');
      steps.push({ why: 'Calculamos el discriminante Δ = b² − 4ac:', tex: '\\Delta = (' + texOf(bb) + ')^2 - 4(' + texOf(aa) + ')(' + texOf(cc) + ') = ' + D.toTeX() });
      const dn = numeric(D.evaluate().text('decimals'));
      if (dn && others.length === 0) {
        const kind = Math.abs(dn.re) < 1e-12 ? 'Δ = 0: hay una solución real doble.' : dn.re > 0 ? 'Δ > 0: hay dos soluciones reales distintas.' : 'Δ < 0: las soluciones son complejas conjugadas.';
        steps.push({ why: kind });
      }
      steps.push({ why: 'Aplicamos la fórmula general:', tex: v + ' = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} = \\frac{-(' + texOf(bb) + ') \\pm \\sqrt{' + D.toTeX() + '}}{2(' + texOf(aa) + ')}' });
      const s1 = N('(-(' + bb + ')+sqrt(' + D + '))/(2*(' + aa + '))').expand();
      const s2 = N('(-(' + bb + ')-sqrt(' + D + '))/(2*(' + aa + '))').expand();
      const same = s1.toString() === s2.toString();
      const sols = same ? [s1] : [s1, s2];
      steps.push({ why: 'Resultado:', html: sols.map((s, i) => '<div>' + showSol(v + (same ? '' : '_' + (i + 1)), s) + '</div>').join('') });
      try {
        const f = N('factor(' + expr + ')');
        if (f.toString() !== expr.toString() && others.length === 0) steps.push({ why: 'Comprobación por factorización:', tex: f.toTeX() + ' = 0' });
      } catch (e) { /* opcional */ }
      return { title: same ? 'Solución (doble)' : 'Soluciones', final: sols.map((s, i) => '<div>' + showSol(v + (same ? '' : '_' + (i + 1)), s) + '</div>').join(''), steps };
    }

    // Caso general (grado ≥ 3 o no polinómica)
    if (isPoly) {
      try {
        const f = N('factor(' + expr + ')');
        if (f.toString() !== expr.toString()) steps.push({ why: 'Factorizamos el polinomio de grado ' + deg + ':', tex: f.toTeX() + ' = 0' });
        steps.push({ why: 'Igualamos cada factor a cero (propiedad del producto nulo).' });
      } catch (e) { /* opcional */ }
    }
    let sols = N.solve(expr.toString(), v).symbol.elements;
    let note;
    if (!isPoly) {
      // Soluciones numéricas: deduplicar y limitar el rango mostrado.
      const seen = new Map();
      for (const s of sols) {
        const n = numeric(N(s.toString()).evaluate().text('decimals'));
        if (!n || Math.abs(n.im) > 1e-9 || Math.abs(n.re) > 20) continue;
        const k = round(n.re, 6);
        if (!seen.has(k)) seen.set(k, s);
      }
      sols = [...seen.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]);
      note = 'Ecuación no polinómica: se muestran las soluciones numéricas encontradas en el intervalo [−20, 20]. Si la función es periódica, hay infinitas soluciones.';
      steps.push({ why: 'No es un polinomio, así que buscamos las raíces numéricamente.' });
    }
    if (!sols.length) return { title: 'Sin solución', final: 'No se encontraron soluciones' + (isPoly ? '.' : ' reales en el intervalo analizado.'), steps, note };
    const html = sols.map((s, i) => '<div>' + showSol(sols.length > 1 ? v + '_' + (i + 1) : v, s) + '</div>').join('');
    steps.push({ why: 'Soluciones:', html });
    return { title: sols.length > 1 ? 'Soluciones' : 'Solución', final: html, steps, note };
  }

  function solveSystem(src) {
    const eqs = normalize(src).split(/[\n;]+/).map(s => s.trim()).filter(Boolean);
    if (eqs.length < 2) throw new Error('Escribe al menos dos ecuaciones, una por línea o separadas por ";".');
    eqs.forEach(e => { if (e.split('=').length !== 2) throw new Error('Cada ecuación necesita exactamente un "=": ' + e); });
    const steps = [{ why: 'Sistema a resolver:', tex: '\\begin{cases}' + eqs.map(e => { const [l, r] = e.split('='); return texOf(l) + ' = ' + texOf(r); }).join('\\\\') + '\\end{cases}' }];
    let res;
    try { res = N.solveEquations(eqs.slice()); } catch (e) { throw new Error('No se pudo resolver el sistema (puede no tener solución o tener infinitas).'); }
    if (!res || !res.length) throw new Error('El sistema no tiene solución única.');
    // Detecta si es lineal para explicar el método
    const linear = eqs.every(e => { const [l, r] = e.split('='); const ex = N('(' + l + ')-(' + r + ')').expand(); return ex.variables().every(v => { try { return Number(N.deg(ex.toString(), v).toString()) <= 1; } catch (er) { return false; } }) && !/\w\*\w|\^/.test(ex.toString().replace(/\d\*/g, '')); });
    steps.push({ why: linear ? 'Es un sistema lineal: se resuelve por eliminación (Gauss), restando múltiplos de unas ecuaciones a otras hasta despejar cada variable.' : 'Sistema no lineal: se despeja una variable y se sustituye en las demás.' });
    const html = res.map(([k, val]) => '<div>' + UI.tex(k + ' = ' + N(String(val)).toTeX()) + '</div>').join('');
    // Comprobación sustituyendo
    const sub = {}; res.forEach(([k, val]) => { sub[k] = String(val); });
    const checks = eqs.map(e => { const [l, r] = e.split('='); const d = N('(' + l + ')-(' + r + ')', sub).evaluate().text('decimals'); const n = numeric(d); return n && Math.abs(n.re) < 1e-8; });
    steps.push({ why: 'Solución:', html });
    steps.push({ why: checks.every(Boolean) ? 'Comprobación: al sustituir, todas las ecuaciones se cumplen ✓' : 'Atención: la comprobación numérica no es exacta en alguna ecuación.' });
    return { title: 'Solución del sistema', final: html, steps, note: linear ? undefined : 'En sistemas no lineales puede haber más soluciones que la mostrada; compruébalo graficando o con el modo IA.' };
  }

  function transform(src, op) {
    const s = normalize(src);
    if (!s) throw new Error('Escribe una expresión.');
    if (s.indexOf('=') !== -1) throw new Error('Escribe una expresión sin "=". Para ecuaciones usa el modo Ecuación.');
    const names = { factorizar: ['factor', 'Forma factorizada'], simplificar: ['simplify', 'Forma simplificada'], expandir: ['expand', 'Forma expandida'] };
    const [fn, title] = names[op];
    const r = N(fn + '(' + s + ')');
    const steps = [{ why: 'Expresión original:', tex: texOf(s) }];
    if (op === 'factorizar') steps.push({ why: 'Buscamos factores comunes, diferencias de cuadrados y raíces racionales del polinomio.' });
    if (op === 'expandir') steps.push({ why: 'Aplicamos la propiedad distributiva y reducimos términos semejantes.' });
    if (op === 'simplificar') steps.push({ why: 'Reducimos términos semejantes y cancelamos factores comunes.' });
    steps.push({ why: title + ':', tex: r.toTeX() });
    return { title, final: UI.tex(r.toTeX(), true), steps, note: r.toString() === N(s).toString() ? 'La expresión ya estaba en su forma más simple para esta operación.' : undefined };
  }

  function preview(src, mode) {
    const s = normalize(src);
    if (!s) return '';
    if (mode === 'sistema') return s.split(/[\n;]+/).filter(Boolean).map(e => { const [l, r] = e.split('='); return UI.tex(texOf(l) + (r !== undefined ? ' = ' + texOf(r) : '')); }).join('<br>');
    const [l, r] = s.split('=');
    return UI.tex(texOf(l) + (r !== undefined ? ' = ' + texOf(r) : ''), true);
  }

  window.ALG = { normalize, solveEquation, solveSystem, transform, preview, pickVar, numeric, round };
})();
