/* Modo IA: el usuario trae su propia clave (Anthropic u OpenAI).
   La clave se guarda solo en localStorage de su navegador y se envía directo al proveedor. */
(function () {
  'use strict';
  const KEY = 'ecuo.ia';
  const DEFAULT_MODEL = { anthropic: 'claude-sonnet-5-5', openai: 'gpt-4.1-mini' };

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { provider: 'anthropic', model: DEFAULT_MODEL.anthropic, key: '' }; }
    catch (e) { return { provider: 'anthropic', model: DEFAULT_MODEL.anthropic, key: '' }; }
  }
  function save(cfg) { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* almacenamiento bloqueado */ } }

  const SYSTEM = {
    matematicas: 'Eres un tutor de matemáticas experto. Resuelve el problema del usuario (texto o foto) en español, paso a paso, explicando el porqué de cada paso de forma clara para un estudiante. Usa LaTeX entre $...$ para fórmulas en línea y $$...$$ para fórmulas destacadas. Termina con una línea "**Respuesta final:**" con el resultado. Si la imagen no es legible o falta información, dilo y pide lo necesario.',
    quimica: 'Eres un tutor de química experto. Resuelve el problema del usuario (texto o foto) en español, paso a paso: identifica datos, plantea la reacción balanceada si aplica, usa masas molares, conversiones de unidades y estequiometría con cuidado, indicando unidades en cada paso. Usa LaTeX entre $...$ y $$...$$ para fórmulas (por ejemplo $\\mathrm{H_2O}$). Termina con "**Respuesta final:**" y el resultado con unidades. Si falta información, dilo.'
  };

  /** Reduce la imagen para ahorrar tokens y la devuelve como data URL JPEG. */
  function shrinkImage(file, max = 1600) {
    return new Promise((resolve, reject) => {
      if (!/^image\//.test(file.type)) return reject(new Error('El archivo no es una imagen.'));
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src); resolve(c.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      img.src = URL.createObjectURL(file);
    });
  }

  async function ask({ text, image, subject }) {
    const cfg = load();
    if (!cfg.key) throw new Error('Configura primero tu clave de API (botón "Configurar IA").');
    if (!text && !image) throw new Error('Escribe un problema o sube una foto.');
    const prompt = text || 'Resuelve el problema de la imagen.';
    const system = SYSTEM[subject] || SYSTEM.matematicas;
    let res, data;
    if (cfg.provider === 'anthropic') {
      const content = [];
      if (image) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image.split(',')[1] } });
      content.push({ type: 'text', text: prompt });
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: cfg.model || DEFAULT_MODEL.anthropic, max_tokens: 4096, system, messages: [{ role: 'user', content }] })
      });
      data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errMsg(res.status, data && data.error && data.error.message));
      return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    } else {
      const content = [{ type: 'text', text: prompt }];
      if (image) content.push({ type: 'image_url', image_url: { url: image } });
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + cfg.key },
        body: JSON.stringify({ model: cfg.model || DEFAULT_MODEL.openai, messages: [{ role: 'system', content: system }, { role: 'user', content }] })
      });
      data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errMsg(res.status, data && data.error && data.error.message));
      return data.choices && data.choices[0] && data.choices[0].message.content || '';
    }
  }

  function errMsg(status, detail) {
    const base = { 401: 'Clave de API inválida.', 403: 'La clave no tiene permiso para este modelo.', 404: 'Modelo no encontrado: revisa el nombre del modelo en la configuración.', 429: 'Límite de uso o saldo agotado en tu cuenta del proveedor.' }[status] || 'Error del proveedor (' + status + ').';
    return base + (detail ? ' Detalle: ' + detail : '');
  }

  window.IA = { load, save, ask, shrinkImage, DEFAULT_MODEL };
})();
