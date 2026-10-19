/* Paso 3 · Actividad: Inma crea a mano una actividad (título, grupo, sesiones, producto, materiales y pasos por sesión)
   y marca los criterios que evalúa. Al guardar pasa a la rúbrica. */
(function (g) {
  'use strict';
  var C = g.Criterios, R = g.Rubrica, T = g.Trabajo, Dm = g.Dom, h = Dm.h, PC = g.PantallaClaude, PT = g.PantallaTraer;
  var MAX_SESIONES = 12;

  function criteriosDelArea(est) {
    var out = [];
    C.competencias(est.areaCrit, est.cursoCrit).forEach(function (c) { c.criterios.forEach(function (k) { out.push(k); }); });
    return out;
  }
  function borrador(est) {
    var gr = est.grupos.filter(function (x) { return x.id === est.grupo; })[0] || est.grupos[0];
    var en = est.enlace;
    return { id: R.nuevoId('a'), titulo: en ? en.titulo : '', grupo: gr ? gr.id : '', area: est.areaCrit, curso: est.cursoCrit, trimestre: est.trimestre || 1,
      criterios: est.criterio ? [est.criterio.id] : [], sesiones: en ? Math.min(MAX_SESIONES, en.sesiones) : 1, producto: '', materiales: '', pasos: [''] };
  }

  async function pintarActividad(est, refrescar) {
    var previas = (await T.actividades(est.carpeta)).filter(function (a) { return !est.criterio || a.criterios.indexOf(est.criterio.id) >= 0; });
    var a = est.actividad ? JSON.parse(JSON.stringify(est.actividad)) : borrador(est);
    var aviso = Dm.aviso(), traido = PT.aviso(est);
    var traer = est.actividad ? null : PT.boton(est, 'actividad', refrescar, await PT.disponibles(est, 'actividad'));
    var todos = criteriosDelArea(est);
    var conocidos = {};
    todos.forEach(function (k) { conocidos[k.id] = k; });

    var titulo = h('input', { type: 'text', id: 'actTitulo', value: a.titulo, placeholder: 'Por ejemplo: Nuestra orquesta de objetos' });
    var grupo = h('select', { id: 'actGrupo', 'aria-label': 'Grupo' }, est.grupos.map(function (x) {
      var o = h('option', { value: x.id, texto: x.nombre }); if (x.id === a.grupo) o.selected = true; return o;
    }));
    var sesiones = h('input', { type: 'number', id: 'actSesiones', min: '1', max: String(MAX_SESIONES), value: String(a.sesiones) });
    var producto = h('input', { type: 'text', id: 'actProducto', value: a.producto, placeholder: 'Lo que los niños entregan o muestran al final' });
    var materiales = h('textarea', { id: 'actMateriales', placeholder: 'Instrumentos, fichas, material del aula…' }); materiales.value = a.materiales;
    var pasosCaja = h('div', { class: 'pasos-sesion', id: 'actPasos' });
    var pasos = a.pasos.slice();
    var pintarPasos = function () {
      var n = Math.max(1, Math.min(MAX_SESIONES, parseInt(sesiones.value, 10) || 1));
      while (pasos.length < n) pasos.push('');
      pasosCaja.textContent = '';
      for (var i = 0; i < n; i++) (function (i) {
        var t = h('textarea', { placeholder: 'Qué se hace en esta sesión', 'aria-label': 'Sesión ' + (i + 1) }); t.value = pasos[i] || '';
        t.oninput = function () { pasos[i] = t.value; };
        pasosCaja.appendChild(h('label', { class: 'campo' }, ['Sesión ' + (i + 1), t]));
      })(i);
    };
    sesiones.oninput = pintarPasos; pintarPasos();

    var marcados = a.criterios.slice();
    var lista = todos.map(function (k) {
      var c = h('input', { type: 'checkbox', 'data-criterio': k.id }); c.checked = marcados.indexOf(k.id) >= 0;
      c.onchange = function () { marcados = marcados.filter(function (x) { return x !== k.id; }); if (c.checked) marcados.push(k.id); };
      return h('label', { class: 'casilla' }, [c, h('b', { texto: k.codigo }), ' ' + k.texto]);
    });

    /* Valida lo escrito, lo guarda como actividad y la devuelve. */
    var guardarTodo = async function () {
      var n = Math.max(1, Math.min(MAX_SESIONES, parseInt(sesiones.value, 10) || 1));
      if (!titulo.value.trim()) throw new Error('Escribe el título de la actividad.');
      if (!marcados.length) throw new Error('Marca al menos un criterio que evalúe esta actividad.');
      a.titulo = titulo.value.trim(); a.grupo = grupo.value; a.sesiones = n; a.producto = producto.value.trim();
      a.materiales = materiales.value.trim(); a.pasos = pasos.slice(0, n); a.criterios = marcados.slice();
      if (est.enlace) a.situacion = est.enlace.sid;
      await T.guardarActividad(est.carpeta, a);
      if (est.enlace) await g.Situacion.enlazar(est.carpeta, est.enlace.sid, est.enlace.n, a.id);
      return a;
    };
    var guardar = h('button', { type: 'button', class: 'boton principal', id: 'guardarActividad', texto: 'Guardar y preparar la rúbrica', onclick: async function () {
      try {
        await guardarTodo();
        est.actividad = a; est.rubrica = null; est.paso = 'rubrica';
        await refrescar();
      } catch (e) { Dm.decir(aviso, e.message || String(e)); }
    } });
    var ayuda = PC.cajaActividad(est, {
      criterios: function () { return marcados.map(function (id) { return conocidos[id]; }).filter(Boolean); },
      actual: function () { return { titulo: titulo.value, duracion: a.duracion || '', sesiones: pasos.length, producto: producto.value, materiales: materiales.value, pasos: pasos.slice(0, parseInt(sesiones.value, 10) || 1), porque: a.porque || '' }; },
      rellenar: function (p) {
        titulo.value = p.titulo; sesiones.value = String(p.sesiones); producto.value = p.producto; materiales.value = p.materiales;
        pasos = p.pasos.slice(); pintarPasos(); a.duracion = p.duracion; a.porque = p.porque; a.porIA = true;
      },
      aceptar: guardarTodo
    }, refrescar);

    var lateral = h('aside', { class: 'tarjeta lateral' }, [h('h2', { texto: 'Actividades de este criterio' })].concat(
      previas.length ? previas.map(function (p) {
        return h('button', { type: 'button', class: 'boton', 'data-actividad': p.id, texto: p.titulo || '(sin título)', onclick: function () { est.actividad = p; est.enlace = null; refrescar(); } });
      }) : [h('p', { class: 'suave', texto: 'Aún no hay ninguna.' })],
      [h('button', { type: 'button', class: 'boton', id: 'actividadNueva', texto: 'Nueva actividad', onclick: function () { est.actividad = null; est.enlace = null; refrescar(); } })]
    ));

    var cabecera = est.criterio && !est.actividad ? 'Criterio ' + est.criterio.codigo + ': ' + est.criterio.texto : '';
    Dm.montar([h('div', { class: 'dos' }, [
      h('div', { class: 'tarjeta', id: 'panelActividad' }, [
        h('h2', { texto: est.actividad ? 'Actividad' : 'Crear actividad' }),
        PT.etiqueta(a), traido, traer,
        cabecera ? h('p', { class: 'suave', texto: cabecera }) : null,
        ayuda,
        h('label', { class: 'campo' }, ['Título', titulo]),
        h('div', { class: 'barra' }, [h('label', { class: 'campo' }, ['Grupo', grupo]), h('label', { class: 'campo' }, ['Sesiones', sesiones])]),
        h('label', { class: 'campo' }, ['Producto final', producto]),
        h('label', { class: 'campo' }, ['Materiales', materiales]),
        pasosCaja,
        h('div', { class: 'campo' }, ['Criterios que evalúa (puede ser más de uno)']),
        h('div', { class: 'criterios-lista' }, lista),
        aviso, guardar
      ]),
      lateral
    ])]);
  }

  g.PantallaActividad = { pintarActividad: pintarActividad };
})(window);
