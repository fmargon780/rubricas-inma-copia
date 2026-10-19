/* Las pantallas. Por ahora solo funciona «Mis grupos»; los demás pasos se activan en las filas 2 a 5.
   Todo el texto de los alumnos entra con textContent, nunca como HTML. */
(function (g) {
  'use strict';
  var D = g.Datos, S = g.Seneca;
  var $ = function (id) { return document.getElementById(id); };

  function h(etiqueta, atributos, hijos) {
    var e = document.createElement(etiqueta);
    Object.keys(atributos || {}).forEach(function (k) {
      if (k === 'texto') e.textContent = atributos[k];
      else if (k.indexOf('on') === 0) e[k] = atributos[k];
      else e.setAttribute(k, atributos[k]);
    });
    (hijos || []).forEach(function (x) { if (x) e.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
    return e;
  }
  function montar(nodos) { var p = $('principal'); p.textContent = ''; nodos.forEach(function (n) { p.appendChild(n); }); }

  function pedirCarpeta(mensaje, alElegir, textoBoton) {
    montar([h('div', { class: 'vacio' }, [
      h('h2', { texto: 'Tu carpeta RÚBRICAS' }),
      h('p', { texto: mensaje }),
      h('button', { type: 'button', class: 'boton principal', id: 'botonCarpeta', texto: textoBoton || 'Elegir la carpeta RÚBRICAS', onclick: alElegir })
    ])]);
  }
  function error(texto) { montar([h('div', { class: 'vacio' }, [h('div', { class: 'aviso error', texto: texto }), h('button', { type: 'button', class: 'boton', texto: 'Volver a intentarlo', onclick: function () { location.reload(); } })])]); }

  function mostrarSeleccion(est) {
    var gr = est.grupos.filter(function (x) { return x.id === est.grupo; })[0];
    var ar = gr && gr.areas.filter(function (a) { return a.id === est.area; })[0];
    $('seleccion').textContent = gr ? gr.nombre + (ar ? ' · ' + ar.nombre : '') : 'Sin grupo elegido';
  }

  /* est = { carpeta, grupos, cuenta, grupo, area }. `refrescar` vuelve a pintar. */
  function pintarGrupos(est, refrescar) {
    mostrarSeleccion(est);
    var guardar = async function (grupos) { est.grupos = grupos; await D.guardarGrupos(est.carpeta, grupos); await refrescar(); };
    var intentar = function (fn) { return async function () { try { await fn(); } catch (e) { $('mensaje').textContent = e.message || String(e); $('mensaje').hidden = false; } }; };

    var tarjetas = est.grupos.map(function (gr) {
      var aviso = h('div', { class: 'aviso error', hidden: '' });
      var entrada = h('input', { type: 'text', placeholder: 'Añadir área…', 'aria-label': 'Nueva área de ' + gr.nombre });
      var subir = h('input', { type: 'file', accept: '.csv,.xls,.txt,.tsv', hidden: '' });
      var manual = h('textarea', { placeholder: 'Un nombre por línea', hidden: '' });
      var zona = h('div', { class: 'zona', texto: 'Suelta aquí el listado de Séneca (CSV o XLS) o pulsa para elegirlo' });
      var decir = function (t) { aviso.textContent = t; aviso.hidden = !t; };

      var guardarNombres = async function (nombres) {
        await D.guardarAlumnado(est.carpeta, gr.id, nombres);
        est.cuenta[gr.id] = nombres.length;
        await refrescar();
      };
      var leerFichero = async function (f) {
        decir('');
        var r = S.reconocerAlumnos(new Uint8Array(await f.arrayBuffer()));
        if (r.ok) await guardarNombres(r.nombres);
        else { decir(r.motivo); manual.hidden = false; botonManual.hidden = false; }
      };
      var botonManual = h('button', { type: 'button', class: 'boton principal', hidden: '', texto: 'Guardar estos nombres', onclick: intentar(async function () {
        var n = S.nombresDeTexto(manual.value);
        if (!n.length) { decir('Escribe al menos un nombre.'); return; }
        await guardarNombres(n);
      }) });
      zona.onclick = function () { subir.click(); };
      zona.ondragover = function (e) { e.preventDefault(); zona.classList.add('encima'); };
      zona.ondragleave = function () { zona.classList.remove('encima'); };
      zona.ondrop = function (e) { e.preventDefault(); zona.classList.remove('encima'); if (e.dataTransfer.files[0]) intentar(function () { return leerFichero(e.dataTransfer.files[0]); })(); };
      subir.onchange = function () { if (subir.files[0]) intentar(function () { return leerFichero(subir.files[0]); })(); };

      var areas = gr.areas.map(function (a) {
        var elegida = est.grupo === gr.id && est.area === a.id;
        return h('span', { class: 'area' + (elegida ? ' elegida' : '') }, [
          h('button', { type: 'button', texto: a.nombre, onclick: function () { est.grupo = gr.id; est.area = a.id; refrescar(); } }),
          h('button', { type: 'button', class: 'quitar', title: 'Quitar el área', 'aria-label': 'Quitar ' + a.nombre, texto: '✕', onclick: intentar(function () { if (est.area === a.id && est.grupo === gr.id) est.area = null; return guardar(D.quitarArea(est.grupos, gr.id, a.id)); }) })
        ]);
      });
      return h('div', { class: 'tarjeta' + (est.grupo === gr.id ? ' elegida' : ''), 'data-grupo': gr.id }, [
        h('h2', {}, [gr.nombre, h('span', { class: 'cuenta', texto: (est.cuenta[gr.id] || 0) + ' alumnos' })]),
        h('div', { class: 'areas' }, areas),
        h('div', { class: 'fila' }, [entrada, h('button', { type: 'button', class: 'boton', texto: 'Añadir', onclick: intentar(function () { var v = entrada.value; return guardar(D.anadirArea(est.grupos, gr.id, v)); }) })]),
        zona, subir, aviso, manual, botonManual,
        h('div', { class: 'fila' }, [
          h('button', { type: 'button', class: 'boton', texto: 'Escribir nombres a mano', onclick: function () { manual.hidden = false; botonManual.hidden = false; } }),
          h('button', { type: 'button', class: 'boton peligro', texto: 'Quitar grupo', onclick: intentar(function () {
            if (!confirm('¿Quitar el grupo ' + gr.nombre + '? Su listado de alumnos no se borra de la carpeta.')) return Promise.resolve();
            if (est.grupo === gr.id) { est.grupo = null; est.area = null; }
            return guardar(D.quitarGrupo(est.grupos, gr.id));
          }) })
        ])
      ]);
    });

    var nuevo = h('input', { type: 'text', placeholder: 'Nuevo grupo, por ejemplo 5º A', 'aria-label': 'Nombre del nuevo grupo' });
    montar([
      h('div', { id: 'mensaje', class: 'aviso error', hidden: '' }),
      h('div', { class: 'rejilla' }, tarjetas),
      h('div', { class: 'nueva' }, [nuevo, h('button', { type: 'button', class: 'boton principal', texto: 'Añadir grupo', onclick: intentar(function () { return guardar(D.anadirGrupo(est.grupos, nuevo.value)); }) })])
    ]);
  }

  g.Pantalla = { pedirCarpeta: pedirCarpeta, error: error, pintarGrupos: pintarGrupos };
})(window);
