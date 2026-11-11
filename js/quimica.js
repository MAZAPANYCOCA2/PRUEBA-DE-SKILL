/* Motor de química: parser de fórmulas, masa molar, balanceo y estequiometría. */
(function () {
  'use strict';
  const EL = window.ELEMENTS.bySym;

  /* ---------- Fracciones exactas con BigInt (para el balanceo) ---------- */
  const babs = a => a < 0n ? -a : a;
  const gcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => a / gcd(a, b) * b;
  function fr(n, d = 1n) { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; }
  const fsub = (a, b) => fr(a.n * b.d - b.n * a.d, a.d * b.d);
  const fmul = (a, b) => fr(a.n * b.n, a.d * b.d);
  const fdiv = (a, b) => fr(a.n * b.d, a.d * b.n);

  /* ---------- Parser de fórmulas ---------- */
  /** Convierte "Ca(OH)2", "CuSO4*5H2O" o "Fe^3+" en {elemento: cantidad}, con la carga en "e". */
  function parseFormula(raw) {
    let s = String(raw).trim().replace(/\s+/g, '');
    if (!s) throw new Error('Fórmula vacía.');
    let charge = 0;
    const cm = s.match(/\^?\{?(\d*)([+-])\}?$/);
    if (cm && /[\^{]/.test(s.slice(s.length - cm[0].length, s.length - cm[0].length + 1))) {
      charge = (cm[1] ? parseInt(cm[1], 10) : 1) * (cm[2] === '+' ? 1 : -1);
      s = s.slice(0, s.length - cm[0].length);
    }
    if (s === 'e' && charge) return { counts: {}, charge }; // electrón: e^-
    const parts = s.split(/[·*•.]/);
    const total = {};
    for (const part of parts) {
      const m = part.match(/^(\d+)(.*)$/);
      const mult = m ? parseInt(m[1], 10) : 1;
      const body = m ? m[2] : part;
      const c = parseGroup(body);
      for (const k in c) total[k] = (total[k] || 0) + c[k] * mult;
    }
    if (!Object.keys(total).length) throw new Error('Fórmula no válida: ' + raw);
    return { counts: total, charge };
  }

  function parseGroup(s) {
    let i = 0;
    function num() { let j = i; while (j < s.length && /\d/.test(s[j])) j++; const n = j > i ? parseInt(s.slice(i, j), 10) : 1; i = j; return n; }
    function seq(close) {
      const out = {};
      while (i < s.length) {
        const ch = s[i];
        if (ch === '(' || ch === '[') {
          i++; const inner = seq(ch === '(' ? ')' : ']'); const n = num();
          for (const k in inner) out[k] = (out[k] || 0) + inner[k] * n;
        } else if (ch === ')' || ch === ']') {
          if (ch !== close) throw new Error('Paréntesis desbalanceados en ' + s);
          i++; return out;
        } else if (/[A-Z]/.test(ch)) {
          let sym = ch; i++;
          if (i < s.length && /[a-z]/.test(s[i]) && EL[sym + s[i]]) { sym += s[i]; i++; }
          else if (i < s.length && /[a-z]/.test(s[i]) && !EL[sym]) { sym += s[i]; i++; }
          if (!EL[sym]) throw new Error('Elemento desconocido: "' + sym + '". Revisa mayúsculas y minúsculas (p. ej. Co es cobalto, CO es monóxido de carbono).');
          const n = num(); out[sym] = (out[sym] || 0) + n;
        } else {
          throw new Error('Carácter no válido "' + ch + '" en ' + s);
        }
      }
      if (close) throw new Error('Falta cerrar un paréntesis en ' + s);
      return out;
    }
    return seq(null);
  }

  function molarMass(formula) {
    const { counts } = parseFormula(formula);
    let M = 0; const rows = [];
    for (const sym in counts) { const m = EL[sym].mass * counts[sym]; M += m; rows.push({ sym, n: counts[sym], mass: EL[sym].mass, sub: m }); }
    rows.forEach(r => { r.pct = r.sub / M * 100; });
    return { M, rows, counts };
  }

  /** Fórmula con subíndices y carga para mostrar en HTML. */
  function pretty(f) {
    const m = String(f).match(/^(.*?)(?:\^?\{?(\d*)([+-])\}?)?$/);
    let body = m[1], ch = '';
    if (m[3] && /[\^{]/.test(f)) ch = '<sup>' + (m[2] || '') + m[3] + '</sup>'; else body = f;
    return UI.esc(body).replace(/([A-Za-z)\]])(\d+)/g, '$1<sub>$2</sub>').replace(/[*·]/g, '·') + ch;
  }

  /* ---------- Balanceo ---------- */
  function splitSide(side) {
    // Protege los "+" de las cargas antes de separar especies.
    const prot = side.replace(/\^\{?(\d*)\+\}?/g, '^$1PLUS').replace(/\^\{?(\d*)-\}?/g, '^$1MINUS');
    return prot.split('+').map(x => x.trim().replace(/PLUS/g, '+').replace(/MINUS/g, '-')).filter(Boolean)
      .map(x => x.replace(/^\d+\s*(?=[A-Z(\[])/, '')); // ignora coeficientes escritos por el usuario
  }

  function balance(eq) {
    const s = String(eq).replace(/<=>|⇌|→|⟶|=>|->|=/g, '→');
    const sides = s.split('→');
    if (sides.length !== 2) throw new Error('Escribe la reacción con una sola flecha, por ejemplo: H2 + O2 -> H2O');
    const react = splitSide(sides[0]), prod = splitSide(sides[1]);
    if (!react.length || !prod.length) throw new Error('Faltan reactivos o productos.');
    const species = react.concat(prod);
    const parsed = species.map(parseFormula);
    const elems = [...new Set(parsed.flatMap(p => Object.keys(p.counts)))];
    const hasCharge = parsed.some(p => p.charge !== 0);
    const rowsKeys = hasCharge ? elems.concat(['carga']) : elems;
    // Matriz: filas = elementos, columnas = especies (productos con signo negativo).
    const A = rowsKeys.map(k => species.map((_, j) => {
      const sign = j < react.length ? 1n : -1n;
      const v = k === 'carga' ? parsed[j].charge : (parsed[j].counts[k] || 0);
      return fr(BigInt(v) * sign);
    }));
    // Eliminación de Gauss-Jordan exacta.
    const rows = A.length, cols = species.length, piv = [];
    let r = 0;
    for (let c = 0; c < cols && r < rows; c++) {
      let p = r; while (p < rows && A[p][c].n === 0n) p++;
      if (p === rows) continue;
      [A[r], A[p]] = [A[p], A[r]];
      const pv = A[r][c]; A[r] = A[r].map(x => fdiv(x, pv));
      for (let i = 0; i < rows; i++) if (i !== r && A[i][c].n !== 0n) { const f = A[i][c]; A[i] = A[i].map((x, j) => fsub(x, fmul(f, A[r][j]))); }
      piv.push(c); r++;
    }
    const free = [...Array(cols).keys()].filter(c => piv.indexOf(c) === -1);
    if (free.length === 0) throw new Error('La reacción no se puede balancear: revisa que los mismos elementos aparezcan en ambos lados.');
    if (free.length > 1) throw new Error('La reacción admite varias formas de balanceo independientes (quizá son dos reacciones combinadas). Sepárala en reacciones más simples.');
    const fc = free[0];
    const sol = Array(cols).fill(null); sol[fc] = fr(1n);
    piv.forEach((c, i) => { sol[c] = fr(-A[i][fc].n, A[i][fc].d); });
    let L = 1n; sol.forEach(x => { L = lcm(L, x.d); });
    let ints = sol.map(x => x.n * (L / x.d));
    if (ints.every(x => x <= 0n)) ints = ints.map(x => -x);
    if (ints.some(x => x <= 0n)) throw new Error('No existe un balanceo con coeficientes positivos: comprueba que la reacción esté bien escrita.');
    let g = 0n; ints.forEach(x => { g = gcd(g, x); }); ints = ints.map(x => x / g);
    const coef = ints.map(Number);

    const fmt = (list, off) => list.map((f, i) => (coef[i + off] > 1 ? '<strong>' + coef[i + off] + '</strong>' : '') + pretty(f)).join(' + ');
    const html = fmt(react, 0) + ' → ' + fmt(prod, react.length);
    // Tabla de conservación de átomos.
    let table = '<table class="data"><tr><th>Elemento</th><th>Reactivos</th><th>Productos</th></tr>';
    for (const k of rowsKeys) {
      const sum = (from, to) => { let t = 0; for (let j = from; j < to; j++) t += coef[j] * (k === 'carga' ? parsed[j].charge : (parsed[j].counts[k] || 0)); return t; };
      const a = sum(0, react.length), b = sum(react.length, cols);
      table += '<tr><td>' + (k === 'carga' ? 'Carga' : k) + '</td><td>' + a + '</td><td>' + b + (a === b ? ' ✓' : ' ✗') + '</td></tr>';
    }
    table += '</table>';
    const steps = [
      { why: 'Contamos los átomos de cada elemento' + (hasCharge ? ' y la carga total' : '') + ' en reactivos y productos: ' + rowsKeys.join(', ') + '.' },
      { why: 'Asignamos un coeficiente desconocido a cada especie y planteamos una ecuación de conservación por elemento:', html: UI.tex(rowsKeys.map(k => species.map((sp, j) => { const v = k === 'carga' ? parsed[j].charge : (parsed[j].counts[k] || 0); return v ? (j >= react.length ? '-' : '+') + (v === 1 ? '' : v) + 'a_{' + (j + 1) + '}' : ''; }).join('').replace(/^\+/, '') + ' = 0').join(',\\quad ')) },
      { why: 'Resolvemos el sistema (eliminación de Gauss) y escalamos a los enteros más pequeños:', html: UI.tex(coef.map((c, i) => 'a_{' + (i + 1) + '}=' + c).join(',\\; ')) },
      { why: 'Comprobación de la conservación:', html: table }
    ];
    return { react, prod, species, coef, html, steps };
  }

  window.CHEM = { parseFormula, molarMass, balance, pretty };
})();
