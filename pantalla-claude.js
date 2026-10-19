/* Lo de Claude en pantalla: «Ajustes» (la clave) y la caja «Pedir a Claude» de la actividad, con su rúbrica al aceptar.
   Textos siempre con textContent. A Claude solo van criterio, área, curso e ideas de Inma, nunca nombres de alumnos. */
(function (g) {
  'use strict';
  var Cl = g.Claude, R = g.Rubrica, T = g.Trabajo, D = g.Datos, Dm = g.Dom, h = Dm.h;
  var ETIQUETA = 'Propuesta de la IA · revísala';

  async function nombresAlumnado(est) {
    var todos = [];
    for (var i = 0; i < est.grupos.length; i++) todos = todos.concat(await D.leerAlumnado(est.carpeta, est.grupos[i].id));
    return todos;
  }
  function nombreArea(est) { var a = g.Criterios.areas().filter(function (x) { return x.id === est.areaCrit; })[0]; return a ? a.nombre : est.areaCrit; }

  /* Pantalla «Ajustes»: la clave se pega una vez y se guarda en la carpeta de Inma. */
  async function pintarAjustes(est, refrescar) {
    var hay = !!(await Cl.leerClave(est.carpeta)), aviso = Dm.aviso();
    var campo = h('input', { type: 'password', id: 'claveClaude', autocomplete: 'off', placeholder: 'sk-ant-…' });
    var guardar = h('button', { type: 'button', class: 'boton principal', id: 'guardarClave', texto: 'Guardar la clave', onclick: async function () {
      try { Dm.decir(aviso, ''); await Cl.guardarClave(est.carpeta, campo.value); await refrescar(); } catch (e) { Dm.decir(aviso, e.message || String(e)); }
    } });
    var quitar = h('button', { type: 'button', class: 'boton peligro', id: 'quitarClave', texto: 'Quitar la clave', onclick: async function () {
      try { await Cl.quitarClave(est.carpeta); await refrescar(); } catch (e) { Dm.decir(aviso, e.message || String(e)); }
    } });
    Dm.montar([h('div', { class: 'tarjeta ajustes', id: 'panelAjustes' }, [
      h('h2', { texto: 'Claude (la ayuda con inteligencia artificial)' }),
      h('p', { id: 'estadoClave', texto: hay ? 'La clave está guardada en tu carpeta. Ya puedes pedir ayuda a Claude.' : 'Todavía no hay clave. La clave te la da Francisco: pégala aquí una sola vez.' }),
      h('p', { class: 'suave', texto: 'Se guarda solo en tu carpeta RÚBRICAS, nunca en la página. A Claude solo se le mandan el criterio, el curso y tus ideas; nunca nombres de alumnos.' }),
      h('label', { class: 'campo' }, ['Clave de Claude', campo]), aviso,
      h('div', { class: 'fila' }, hay ? [guardar, quitar] : [guardar])
    ])]);
  }

  /* La caja de la pantalla de actividad. ctx: { criterios(), actual(), rellenar(propuesta), aceptar() -> actividad guardada }. */
  function cajaActividad(est, ctx, refrescar) {
    var aviso = Dm.aviso(), propuesta = null;
    var idea = h('textarea', { id: 'claudeIdea', placeholder: 'Tu idea en una o dos frases. Por ejemplo: una carta a un compañero sobre la excursión; tengo dos sesiones.' });
    var estado = h('p', { class: 'suave', id: 'claudeEstado' });
    var cambios = h('textarea', { id: 'claudeCambios', placeholder: 'Qué quieres que cambie' });
    var resultado = h('div', { class: 'propuesta-ia', id: 'propuestaIA', hidden: '' });

    var ocupado = function (texto) { estado.textContent = texto || ''; Array.prototype.forEach.call(caja.querySelectorAll('button'), function (b) { b.disabled = !!texto; }); };
    var contexto = function () {
      var criterios = ctx.criterios();
      if (!criterios.length) throw new Error('Marca antes al menos un criterio (abajo) para que Claude sepa qué evaluar.');
      return { area: nombreArea(est), curso: est.cursoCrit, criterios: criterios };
    };
    var conClave = async function (fn) {
      Dm.decir(aviso, '');
      try {
        var clave = await Cl.leerClave(est.carpeta);
        if (!clave) throw Object.assign(new Error('Falta la clave de Claude. Pégala una vez en «Ajustes».'), { codigo: 'sin-clave' });
        await fn(clave, await nombresAlumnado(est));
      } catch (e) { ocupado(''); Dm.decir(aviso, e.message || String(e)); if (e.codigo === 'sin-clave' || e.codigo === 'clave') mostrarAjustes(); }
    };
    var mostrarAjustes = function () {
      aviso.appendChild(document.createTextNode(' '));
      aviso.appendChild(h('button', { type: 'button', class: 'boton', id: 'irAjustes', texto: 'Ir a Ajustes', onclick: function () { est.paso = 'ajustes'; refrescar(); } }));
    };
    var proponer = function (anterior, textoCambios) {
      return conClave(async function (clave, nombres) {
        var c = contexto(); c.idea = idea.value.trim(); c.anterior = anterior; c.cambios = textoCambios;
        if (!c.idea) throw new Error('Escribe tu idea en una o dos frases.');
        ocupado('Claude está pensando…');
        propuesta = await Cl.proponerActividad(clave, c, nombres);
        ctx.rellenar(propuesta); ocupado('');
        resultado.hidden = false; cambios.value = '';
        porque.textContent = 'Por qué encaja: ' + propuesta.porque + ' · ' + propuesta.duracion;
      });
    };
    var porque = h('p', { class: 'suave', id: 'claudePorque' });
    resultado.appendChild(h('p', { class: 'etiqueta-ia', texto: ETIQUETA }));
    resultado.appendChild(porque);
    resultado.appendChild(h('p', { class: 'suave', texto: 'Ya está escrita en los campos de abajo: puedes editarla.' }));
    resultado.appendChild(h('label', { class: 'campo' }, ['Pedir cambios', cambios]));
    resultado.appendChild(h('div', { class: 'fila' }, [
      h('button', { type: 'button', class: 'boton', id: 'pedirCambios', texto: 'Pedir cambios', onclick: function () {
        if (!cambios.value.trim()) { Dm.decir(aviso, 'Escribe qué quieres que cambie.'); return; }
        proponer(ctx.actual(), cambios.value.trim());
      } }),
      h('button', { type: 'button', class: 'boton principal', id: 'aceptarClaude', texto: 'Aceptar y crear la rúbrica', onclick: function () {
        conClave(async function (clave, nombres) {
          var c = contexto(); c.actividad = await ctx.aceptar();
          ocupado('Claude está preparando la rúbrica…');
          var filas = await Cl.proponerRubrica(clave, c, nombres);
          var r = R.rubricaNueva(c.actividad.id, c.actividad.titulo, 0);
          r.filas = filas.map(function (f) { var x = R.filaNueva(f.texto); x.peso = f.peso; x.celdas = f.celdas; return x; });
          r.porIA = true;
          await T.guardarRubrica(est.carpeta, r);
          est.actividad = c.actividad; est.rubrica = r; est.paso = 'rubrica'; await refrescar();
        });
      } })
    ]));

    var caja = h('div', { class: 'caja-ia', id: 'cajaClaude' }, [
      h('h3', { texto: 'Pedir a Claude' }),
      h('p', { class: 'suave', texto: 'Cuéntale tu idea y te propone la actividad y su rúbrica. No escribas nombres de alumnos.' }),
      idea,
      h('div', { class: 'fila' }, [h('button', { type: 'button', class: 'boton principal', id: 'pedirClaude', texto: 'Proponer con Claude', onclick: function () { proponer(null, null); } })]),
      estado, aviso, resultado
    ]);
    return caja;
  }

  g.PantallaClaude = { pintarAjustes: pintarAjustes, cajaActividad: cajaActividad, nombresAlumnado: nombresAlumnado, ETIQUETA: ETIQUETA };
})(window);
