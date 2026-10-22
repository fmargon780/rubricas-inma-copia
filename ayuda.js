/* Ayuda: carga de ayuda.json, estado de la guía de «Primeros pasos» y avisos «i». Sin pantalla propia: la dibuja pantalla-ayuda.js.
   Todo texto entra con textContent; los enlaces de los textos se crean por código y se abren en pestaña nueva. */
(function (g) {
  'use strict';
  var CLAVE_LOCAL = 'rubricasGuiaCerrada';
  var datos = null, cargando = null;

  /* ayuda.json se pide con fetch; en la copia sin internet (file:) no se puede, y la copia trae ayuda-datos.js con lo mismo. */
  function cargar() {
    if (cargando) return cargando;
    cargando = new Promise(function (listo) {
      var deScript = function () {
        var s = document.createElement('script');
        s.src = 'ayuda-datos.js';
        s.onload = function () { datos = g.AYUDA_DATOS || null; s.remove(); listo(datos); };
        s.onerror = function () { s.remove(); listo(null); };
        document.head.appendChild(s);
      };
      if (location.protocol === 'file:') { deScript(); return; }
      fetch('ayuda.json').then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then(function (d) { datos = d; listo(d); }, deScript);
    });
    return cargando;
  }

  /* Pone en `padre` el texto, con las direcciones web como enlaces que se abren en otra pestaña. */
  function texto(padre, t) {
    String(t).split(/(https?:\/\/[^\s)"]*[^\s).,;:"])/).forEach(function (trozo, i) {
      if (i % 2) {
        var a = document.createElement('a');
        a.href = trozo; a.textContent = trozo; a.target = '_blank'; a.rel = 'noopener noreferrer';
        padre.appendChild(a);
      } else if (trozo) padre.appendChild(document.createTextNode(trozo));
    });
    return padre;
  }

  /* La guía se cierra «para siempre» en config.json (vale en todos sus equipos); antes de elegir carpeta, en el navegador. */
  function cerradaLocal() { try { return g.localStorage.getItem(CLAVE_LOCAL) === '1'; } catch (e) { return false; } }
  function recordarLocal() { try { g.localStorage.setItem(CLAVE_LOCAL, '1'); } catch (e) { /* sin almacenamiento, la guía saldrá otra vez */ } }
  function cerrada(est) { return est ? !!(est.configReal || est.config || {}).guiaCerrada : cerradaLocal(); }
  async function cerrar(est) {
    recordarLocal();
    if (!est || !est.configReal || est.configReal.guiaCerrada) return;
    est.configReal.guiaCerrada = true;
    await est.raiz.escribirJSON('config.json', est.configReal);
  }
  /* Si la guía se cerró antes de elegir carpeta, esa decisión pasa a la carpeta. */
  async function traspasarCierre(est) { if (cerradaLocal() && !est.configReal.guiaCerrada) await cerrar(est); }

  /* [carpeta, ajustes, grupos, situación] → true/false, mirando el estado real. */
  async function pasosHechos(est) {
    if (!est) return [false, false, false, false];
    var cfg = est.configReal || est.config || {}, hechos = [true];
    var clave = ''; try { clave = await g.Claude.leerClave(est.carpeta); } catch (e) { /* sin clave legible */ }
    hechos.push(!!clave && !!String(cfg.colegio || '').trim());
    var actual = await g.Cursos.abrir(est.raiz, cfg, cfg.cursoActual);
    var cuenta = await g.Datos.contarAlumnos(actual.carpeta, actual.grupos);
    hechos.push(actual.grupos.some(function (x) { return (cuenta[x.id] || 0) > 0; }));
    hechos.push((await g.Situacion.todas(actual.carpeta)).length > 0);
    return hechos;
  }

  /* Avisos «i»: dónde va cada uno. `despues` lo pone a continuación del elemento; si no, dentro. */
  var AVISOS = {
    clave: { paso: 'ajustes', sel: '#panelAjustes h2' },
    correo: { paso: 'ajustes', sel: '#panelCorreo h2' },
    listado: { paso: 'grupos', sel: '.zona' },
    cursoNuevo: { paso: 'grupos', sel: '#empezarCurso', despues: true },
    traer: { paso: 'actividad', sel: '#traerPasado', despues: true },
    seneca: { paso: 'situacion', sel: '#prepararSeneca, #prepararListado', despues: true },
    claude: { paso: 'actividad', sel: '#pedirClaude', despues: true }
  };
  var burbuja = null;
  function quitarBurbuja() { if (burbuja) { burbuja.remove(); burbuja = null; } }
  function mostrarAviso(boton, id) {
    var otra = burbuja && burbuja.dataset.aviso === id && burbuja.dataset.de === boton.dataset.n;
    quitarBurbuja();
    if (otra || !datos || !datos.avisos[id]) return;
    burbuja = document.createElement('div');
    burbuja.className = 'burbuja-i'; burbuja.setAttribute('role', 'tooltip'); burbuja.dataset.aviso = id; burbuja.dataset.de = boton.dataset.n;
    texto(burbuja, datos.avisos[id]);
    document.body.appendChild(burbuja);
    var r = boton.getBoundingClientRect();
    burbuja.style.left = Math.max(8, Math.min(r.left, g.innerWidth - burbuja.offsetWidth - 8)) + 'px';
    burbuja.style.top = Math.min(r.bottom + 6, g.innerHeight - burbuja.offsetHeight - 8) + window.scrollY + 'px';
  }
  var contador = 0;
  /* Pone los «i» que falten en la pantalla recién pintada. Es seguro llamarlo cuantas veces haga falta. */
  function ponerAvisos(paso) {
    if (!datos) return;
    Object.keys(AVISOS).forEach(function (id) {
      var a = AVISOS[id];
      if (!datos.avisos[id]) return;
      Array.prototype.forEach.call(document.querySelectorAll('#principal ' + a.sel.split(',').join(', #principal ')), function (el) {
        if (el.dataset.conAviso) return;
        el.dataset.conAviso = '1';
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'aviso-i'; b.textContent = 'i'; b.dataset.n = String(++contador); b.dataset.aviso = id;
        b.setAttribute('aria-label', 'Qué es esto');
        b.onclick = function (e) { e.preventDefault(); e.stopPropagation(); mostrarAviso(b, id); };
        if (a.despues) el.insertAdjacentElement('afterend', b); else el.appendChild(b);
      });
    });
  }
  document.addEventListener('click', function (e) { if (burbuja && !(e.target.closest && e.target.closest('.aviso-i, .burbuja-i'))) quitarBurbuja(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') quitarBurbuja(); });

  g.Ayuda = { cargar: cargar, datos: function () { return datos; }, texto: texto, cerrada: cerrada, cerrar: cerrar, traspasarCierre: traspasarCierre,
    pasosHechos: pasosHechos, ponerAvisos: ponerAvisos, AVISOS: AVISOS };
})(window);
