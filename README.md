# MazapanYCoca: resolvedor de matemáticas y química

MazapanYCoca es una alternativa propia, gratuita y sin muros de pago a los resolvedores de tareas con IA. Toma como referencia de funciones a Solvely, pero no reutiliza su nombre, su marca ni su código.

**Funciona 100 % en el navegador.** Es HTML, CSS y JavaScript estático, sin paso de compilación y con todas las librerías incluidas en `vendor/`. Por eso funciona en GitHub Pages tal cual.

## Funciones

| Área | Qué hace | Motor |
|---|---|---|
| Álgebra · Ecuación | Lineales y cuadráticas con pasos completos (discriminante y fórmula general); polinomios de grado ≥ 3 por factorización; ecuaciones no polinómicas con raíces numéricas; gráfica de las raíces | nerdamer (local) |
| Álgebra · Sistema | Sistemas lineales y no lineales con comprobación por sustitución | nerdamer |
| Álgebra · Factorizar / Simplificar / Expandir | Formas algebraicas | nerdamer |
| Cálculo · Derivada | Paso a paso, término a término, nombrando la regla que se aplica (potencia, producto, cociente, cadena…); gráfica de f y f′ | nerdamer + math.js |
| Cálculo · Integral | Indefinida (con comprobación al derivar) y definida (teorema fundamental, o Simpson adaptativo si no hay primitiva); área sombreada | nerdamer + Simpson propio |
| Cálculo · Límite | Sustitución directa, tabla de aproximación por izquierda y derecha, límites al infinito | nerdamer |
| Cálculo · Gráfica | Gráfica interactiva (mover y zoom) con derivada opcional; exporta a PNG | Canvas propio |
| Química · Balancear | Balanceo exacto por álgebra lineal (fracciones BigInt), con iones, cargas, hidratos y tabla de conservación | Propio |
| Química · Masa molar | Masa molar y composición porcentual | Propio (118 elementos) |
| Química · Estequiometría | Moles y masas de cada especie, reactivo limitante y exceso | Propio |
| Química · Tabla periódica | Tabla interactiva con los datos de cada elemento | Propio |
| IA · Texto / foto | Problemas redactados y fotos de ejercicios, resueltos paso a paso | API de Anthropic u OpenAI con **la clave del propio usuario** |
| Extras | Historial local, modo oscuro, teclado matemático, vista previa en LaTeX, diseño adaptable a móvil | — |

### Sobre el modo IA

GitHub Pages no puede ocultar secretos, así que el sitio no lleva ninguna clave. Cada usuario pega la suya en **⚙️ Configurar IA**. La clave se guarda solo en el `localStorage` de su navegador y se envía directamente a `api.anthropic.com` o a `api.openai.com`. El nombre del modelo se puede editar.

## Publicar en GitHub Pages

1. Fusiona esta rama con `main`.
2. En el repositorio, ve a **Settings → Pages → Build and deployment**.
3. Elige **Source: Deploy from a branch**, la rama **main** y la carpeta **/ (root)**, y pulsa **Save**.
4. En uno o dos minutos estará en `https://<usuario>.github.io/<repositorio>/`.

## Ejecutar en local

```bash
python3 -m http.server 8000   # luego abre http://localhost:8000
```

Hace falta un servidor y no basta con abrir el archivo directamente, porque el navegador no carga las fuentes de KaTeX desde `file://`.

## Estructura

```
index.html        Interfaz
css/styles.css    Estilos (claro/oscuro, responsive)
js/render.js      KaTeX, tarjetas de resultado, Markdown seguro
js/algebra.js     Ecuaciones, sistemas, factorizar/simplificar/expandir
js/calculo.js     Derivadas, integrales, límites, gráficas
js/quimica.js     Parser de fórmulas, masa molar, balanceo
js/elementos.js   Datos de los 118 elementos
js/ia.js          Cliente de Anthropic/OpenAI (clave del usuario)
js/app.js         Controlador de la interfaz e historial
vendor/           nerdamer (MIT), math.js (Apache-2.0), KaTeX (MIT)
```

## Limitaciones conocidas

- Fuera de las ecuaciones lineales y cuadráticas, y de las reglas de derivación, los pasos son de alto nivel: se muestra el método y el resultado, no cada manipulación intermedia.
- En las ecuaciones trigonométricas o trascendentes se muestran las raíces numéricas dentro de [−20, 20].
- En los sistemas no lineales puede aparecer solo una de varias soluciones.
- La lectura de fotos y la comprensión de problemas en texto requieren el modo IA, que necesita una clave del usuario. No hay OCR local.
