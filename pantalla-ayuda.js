/* Las dos pantallas de la ayuda: la guía de «Primeros pasos» (ventana sobre la pantalla) y la página de ayuda del botón «?».
   Textos siempre con textContent. Los textos vienen de ayuda.json. */
(function (g) {
  'use strict';
  var A = g.Ayuda, Dm = g.Dom, h = Dm.h;
  var puente = { est: null, ir: function () {}, elegir: function () {} };
  var yaSalio = false;

  function quitar(id) { var e = document.getElementById(id); if (e) e.remove(); }

  /* La guía. Las marcas ✓ se calculan en el momento mirando el estado real. */
  async function abrirGuia() {
    var d = A.datos(); if (!d) return;
    quitar('guiaPrimerosPasos');
    var hechos = await A.pasosHechos(puente.est), t = d.guiaTextos, todos = hechos.every(Boolean);
    var cerrar = function () { quitar('guiaPrimerosPasos'); };
    var lista = h('ol', { class: 'guia-pasos' }, d.guia.map(function (p, i) {
      var ir = h('button', { type: 'button', class: 'boton', 'data-ir': p.ir, texto: t.ir, onclick: function () {
        cerrar();
        if (p.ir === 'carpeta') { if (!puente.est) puente.elegir(); } else puente.ir(p.ir);
      } });
      return h('li', { class: 'guia-paso' + (hechos[i] ? ' hecho' : ''), 'data-paso': p.id }, [
        h('span', { class: 'marca', 'aria-label': hechos[i] ? t.hecho : '', texto: hechos[i] ? '✓' : String(i + 1) }),
        h('div', { class: 'guia-texto' }, [h('h3', { texto: p.titulo }), A.texto(h('p'), p.texto)]),
        ir
      ]);
    }));
    var cerrarSiempre = h('button', { type: 'button', class: 'boton principal', id: 'cerrarGuia', texto: t.cerrar, onclick: async function () {
      try { await A.cerrar(puente.est); } catch (e) { /* si no se puede guardar, queda recordado en este navegador */ }
      cerrar();
    } });
    var caja = h('div', { class: 'guia', role: 'dialog', 'aria-label': t.titulo }, [
      h('h2', { texto: t.titulo }), h('p', { class: 'suave', texto: t.intro }), lista,
      todos ? h('p', { class: 'guia-listo', id: 'guiaListo', texto: t.listo }) : null,
      h('div', { class: 'fila' }, [cerrarSiempre, h('button', { type: 'button', class: 'boton', id: 'ocultarGuia', texto: 'Ahora no', onclick: cerrar })])
    ]);
    document.body.appendChild(h('div', { class: 'capa-ayuda', id: 'guiaPrimerosPasos' }, [caja]));
    cerrarSiempre.focus();
  }

  /* Sale sola si falta algún paso y la guía no se ha cerrado; nunca en un curso pasado. */
  async function guiaSola() {
    var est = puente.est;
    if (yaSalio || !A.datos() || A.cerrada(est) || (est && !est.editable)) return;
    yaSalio = true;
    if (est && (await A.pasosHechos(est)).every(Boolean)) return;
    await abrirGuia();
  }

  var SECCION_DE = { carpeta: 'carpeta', grupos: 'grupos', situacion: 'situacion', criterio: 'criterio', actividad: 'actividad', rubrica: 'rubrica', calificar: 'calificar', hoja: 'hoja', ajustes: 'ajustes' };

  /* La página de ayuda: índice a la izquierda y texto a la derecha, abierta en la sección de la pantalla de la que se viene. */
  function abrirPagina(inicial) {
    var d = A.datos();
    quitar('paginaAyuda');
    if (!d) { Dm.montar([h('div', { class: 'aviso', texto: 'La ayuda no está disponible en este momento. Actualiza la página.' })]); return; }
    var secciones = [{ id: 'primeros', titulo: 'Primeros pasos' }];
    Object.keys(d.pantallas).forEach(function (k) { secciones.push({ id: k, titulo: d.pantallas[k].titulo }); });
    Object.keys(d.extras).forEach(function (k) { secciones.push({ id: k, titulo: d.extras[k].titulo }); });
    var texto = h('div', { class: 'ayuda-texto', id: 'ayudaTexto' }), indice = h('nav', { class: 'ayuda-indice', 'aria-label': 'Índice de la ayuda' });
    var pintar = function (id) {
      Array.prototype.forEach.call(indice.children, function (b) { b.classList.toggle('activo', b.dataset.seccion === id); });
      texto.textContent = ''; texto.dataset.seccion = id;
      var s = secciones.filter(function (x) { return x.id === id; })[0];
      texto.appendChild(h('h2', { texto: s.titulo }));
      if (id === 'primeros') {
        d.primeros.forEach(function (p) { texto.appendChild(A.texto(h('p'), p)); });
        texto.appendChild(h('ol', {}, d.guia.map(function (p) { return h('li', {}, [h('strong', { texto: p.titulo + '. ' }), A.texto(h('span'), p.texto)]); })));
      } else if (d.extras[id] && d.extras[id].preguntas) {
        d.extras[id].preguntas.forEach(function (q) { texto.appendChild(h('h3', { texto: q.p })); texto.appendChild(A.texto(h('p'), q.r)); });
      } else {
        ((d.pantallas[id] || d.extras[id]).parrafos).forEach(function (p) { texto.appendChild(A.texto(h('p'), p)); });
      }
    };
    secciones.forEach(function (s) { indice.appendChild(h('button', { type: 'button', 'data-seccion': s.id, texto: s.titulo, onclick: function () { pintar(s.id); } })); });
    var cerrar = function () { quitar('paginaAyuda'); };
    var capa = h('div', { class: 'capa-ayuda pagina', id: 'paginaAyuda', role: 'dialog', 'aria-label': 'Ayuda' }, [
      h('div', { class: 'ayuda-barra' }, [h('h1', { texto: 'Ayuda' }),
        h('button', { type: 'button', class: 'boton', id: 'verGuia', texto: 'Ver la guía de primeros pasos', onclick: function () { cerrar(); abrirGuia(); } }),
        h('button', { type: 'button', class: 'boton principal', id: 'cerrarAyuda', texto: 'Cerrar la ayuda', onclick: cerrar })]),
      h('div', { class: 'ayuda-cuerpo' }, [indice, texto])
    ]);
    document.body.appendChild(capa);
    pintar(SECCION_DE[inicial] || 'primeros');
    capa.querySelector('#cerrarAyuda').focus();
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { quitar('paginaAyuda'); quitar('guiaPrimerosPasos'); }
  });

  /* arranque.js presenta la app a la ayuda: carpeta abierta (o null), cómo ir a un paso y cómo elegir la carpeta. */
  function conectar(est, ir, elegir) { puente.est = est; puente.ir = ir || puente.ir; puente.elegir = elegir || puente.elegir; }
  function boton() {
    var b = document.getElementById('botonAyuda');
    if (b) b.onclick = function () { abrirPagina((g.RubricasSoporte || {}).paso); };
  }

  g.PantallaAyuda = { abrirGuia: abrirGuia, abrirPagina: abrirPagina, guiaSola: guiaSola, conectar: conectar, boton: boton };
})(window);
