/* Utilidades de presentación: KaTeX, bloques de resultado y Markdown mínimo. */
(function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function tex(src, display) {
    try {
      return katex.renderToString(String(src), { throwOnError: false, displayMode: !!display });
    } catch (e) {
      return '<code>' + esc(src) + '</code>';
    }
  }

  /**
   * Construye la tarjeta de resultado.
   * @param {{title?:string, final?:string, steps?:Array<{why:string, html?:string, tex?:string}>, note?:string, extraHTML?:string}} r
   */
  function answer(r) {
    let h = '<div class="answer">';
    h += '<h3>' + esc(r.title || 'Resultado') + '</h3>';
    if (r.final) h += '<div class="final">' + r.final + '</div>';
    if (r.extraHTML) h += r.extraHTML;
    if (r.steps && r.steps.length) {
      h += '<h3 style="margin-top:14px">Paso a paso</h3><ol class="steps">';
      for (const s of r.steps) {
        h += '<li><span class="why">' + esc(s.why) + '</span>' +
          (s.tex ? tex(s.tex, true) : '') + (s.html || '') + '</li>';
      }
      h += '</ol>';
    }
    if (r.note) h += '<p class="note">' + esc(r.note) + '</p>';
    return h + '</div>';
  }

  function error(msg) {
    return '<div class="answer error"><h3>No se pudo resolver</h3><div class="final">' + esc(msg) + '</div></div>';
  }

  /** Markdown mínimo y seguro (escapa HTML) con soporte de fórmulas LaTeX. */
  function markdown(src) {
    const maths = [];
    let s = String(src);
    // Protege fórmulas antes de escapar.
    s = s.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]/g, (_, a, b) => { maths.push([a || b, true]); return '\u0000' + (maths.length - 1) + '\u0000'; });
    s = s.replace(/\\\(([\s\S]+?)\\\)|\$([^\$\n]+?)\$/g, (_, a, b) => { maths.push([a || b, false]); return '\u0000' + (maths.length - 1) + '\u0000'; });
    s = esc(s);
    const lines = s.split(/\n/);
    let out = '', list = null, para = [];
    const flushP = () => { if (para.length) { out += '<p>' + para.join('<br>') + '</p>'; para = []; } };
    const flushL = () => { if (list) { out += '</' + list + '>'; list = null; } };
    const inline = t => t
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    for (const raw of lines) {
      const line = raw.trimEnd();
      let m;
      if (!line.trim()) { flushP(); flushL(); continue; }
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { flushP(); flushL(); out += '<h4>' + inline(m[2]) + '</h4>'; continue; }
      if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) { flushP(); if (list !== 'ul') { flushL(); out += '<ul>'; list = 'ul'; } out += '<li>' + inline(m[1]) + '</li>'; continue; }
      if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { flushP(); if (list !== 'ol') { flushL(); out += '<ol>'; list = 'ol'; } out += '<li>' + inline(m[1]) + '</li>'; continue; }
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { flushP(); flushL(); out += '<hr>'; continue; }
      flushL(); para.push(inline(line));
    }
    flushP(); flushL();
    return out.replace(/\u0000(\d+)\u0000/g, (_, i) => tex(maths[i][0], maths[i][1]));
  }

  window.UI = { esc, tex, answer, error, markdown };
})();
