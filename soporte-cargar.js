/* Presenta la app al botón «Soporte» único (vive en fmargon780/soporte-apps) y lo pide a Google tras el `load`.
   Aquí solo se recogen los errores tempranos, se pone window.SOPORTE_APP y se pide el botón con un <script> metido por código.
   Sin conexión con Google no sale ningún botón. No se pide bajo un navegador manejado por un programa, salvo con `soporte=1`.
   Lo que sabe la app llega por window.RubricasSoporte (paso, correo, nombres), que arranque.js rellena; aquí solo se lee al abrir y al enviar.
   De la carpeta de Inma no viaja nada: solo el nombre del paso abierto, de una lista fija. */
(function () {
  'use strict';
  var REPO = 'fmargon780/rubricas-inma';
  var DIRECCION = 'https://script.google.com/macros/s/AKfycbz2LFRhlvnlUjr_QZFW5cuY3ayE-wmXCCg1TdtUCNDJ6SEosNMetkZP6muz1NVwFDMXhQ/exec?boton=1&repo=' + REPO;
  var CADA_MS = 10 * 60 * 1000, MAX_ERRORES = 20, LARGO_ERROR = 300;
  var PANTALLAS = { grupos: 'Mis grupos', situacion: 'Situación', criterio: 'Criterio', actividad: 'Actividad', rubrica: 'Rúbrica', calificar: 'Calificar', hoja: 'Hoja del alumno', ajustes: 'Ajustes', carpeta: 'Elegir la carpeta' };
  var errores = [];

  function estado() { return window.RubricasSoporte || { paso: 'carpeta', correo: '', nombres: [] }; }
  function esc(t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* Cambia cualquier nombre del alumnado (completo, o cada palabra de más de 3 letras) por «[alumno]», sin distinguir mayúsculas. */
  function limpiar(texto) {
    texto = String(texto);
    var partes = [];
    (estado().nombres || []).forEach(function (n) {
      n = String(n || '').trim(); if (!n) return;
      partes.push(n);
      n.split(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/).forEach(function (w) { if (w.length > 3) partes.push(w); });
    });
    if (!partes.length) return texto;
    partes.sort(function (a, b) { return b.length - a.length; });
    return texto.replace(new RegExp(partes.map(esc).join('|'), 'gi'), '[alumno]');
  }

  function hora() { var d = new Date(); function dos(n) { return (n < 10 ? '0' : '') + n; } return dos(d.getHours()) + ':' + dos(d.getMinutes()); }
  function apuntarError(texto) {
    if (window.__soporteBoton) return; /* desde que existe el botón, los recoge él */
    errores.push(hora() + ' ' + String(texto).replace(/\s+/g, ' ').slice(0, LARGO_ERROR));
    if (errores.length > MAX_ERRORES) errores.shift();
  }
  window.addEventListener('error', function (e) { apuntarError((e && e.message) + (e && e.filename ? ' (' + String(e.filename).split('/').pop() + ':' + e.lineno + ')' : '')); });
  window.addEventListener('unhandledrejection', function (e) { var r = e && e.reason; apuntarError('Promesa rechazada: ' + ((r && r.message) || r)); });
  if (window.console && typeof console.error === 'function') {
    var original = console.error;
    console.error = function () {
      try { apuntarError(Array.prototype.map.call(arguments, function (a) { return (a && a.message) ? a.message : String(a); }).join(' ')); } catch (e) { /* recoger errores nunca da errores */ }
      return original.apply(console, arguments);
    };
  }

  window.SOPORTE_APP = {
    repo: REPO,
    get version() { var p = document.getElementById('versionPagina'); return p ? p.textContent : ''; },
    pantalla: function () { return PANTALLAS[estado().paso] || 'Otra'; },
    contexto: function () { return ''; },
    persona: function () { var c = estado().correo; return c ? { nombre: 'Inma', correo: String(c) } : {}; },
    errores: function () { return errores.map(limpiar); },
    limpiar: limpiar
  };
  window.SoporteCargar = { limpiar: limpiar, PANTALLAS: PANTALLAS };

  function sePide() {
    if (/(^|[?&])soporte=1(&|$)/.test(location.search)) return true;
    return !(navigator && navigator.webdriver);
  }
  var pidiendo = false;
  function pedir() {
    if (window.__soporteBoton || pidiendo || !document.body) return;
    pidiendo = true;
    var s = document.createElement('script');
    s.src = window.__SOPORTE_DIRECCION__ || DIRECCION; /* las pruebas sirven un botón de mentira */
    s.async = true;
    s.onload = s.onerror = function () { pidiendo = false; s.remove(); };
    document.head.appendChild(s);
  }
  if (!sePide()) return;
  function empezar() { pedir(); window.addEventListener('online', pedir); setInterval(pedir, CADA_MS); }
  if (document.readyState === 'complete') empezar(); else window.addEventListener('load', empezar);
})();
