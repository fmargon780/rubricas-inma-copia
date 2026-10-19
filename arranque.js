/* Arranque: recuerda la carpeta entre visitas, la abre y pinta «Mis grupos». */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var MODO = window.modoApp ? window.modoApp() : 'página web';
  $('versionPagina').textContent = window.VERSION_PAGINA + ' · ' + (window.COMMIT_PAGINA || 'sin-marca') + ' · ' + MODO;

  async function abrir(handle) {
    var raiz = window.Carpeta.adaptador(handle);
    $('estadoCarpeta').textContent = 'Carpeta: ' + handle.name;
    var base = await window.Cursos.iniciar(raiz);
    var est = { raiz: raiz, carpeta: null, config: null, configReal: base.config, cursos: base.cursos, curso: null, editable: true, grupos: [], actividad: null, rubrica: null, cuenta: {}, grupo: null, area: null, paso: 'grupos', criterio: null };
    var refrescar;

    /* Cambia el curso que se mira (el actual, o uno pasado solo para consultar) y vuelve a «Mis grupos». */
    var verCurso = async function (curso) {
      var c = await window.Cursos.abrir(raiz, est.configReal, curso);
      est.curso = curso; est.carpeta = c.carpeta; est.editable = c.editable; est.grupos = c.grupos; est.config = c.config;
      est.anterior = c.editable ? await window.Cursos.puedeDeshacer(raiz, est.configReal) : null;
      est.cursos = await window.Cursos.listarCursos(raiz);
      est.actividad = est.rubrica = est.criterio = est.situacion = est.enlace = est.grupo = est.area = null; est.situacionNueva = false; est.paso = 'grupos';
      pintarCabeceraCurso();
    };
    var pintarCabeceraCurso = function () {
      var sel = $('selectorCurso'), aviso = $('avisoCurso');
      sel.textContent = '';
      est.cursos.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; o.selected = c === est.curso; sel.appendChild(o); });
      sel.onchange = function () { verCurso(sel.value).then(function () { return refrescar(); }).catch(function (e) { window.Pantalla.error(e.message || String(e)); }); };
      aviso.textContent = ''; aviso.hidden = est.editable;
      if (!est.editable) {
        var volver = document.createElement('button');
        volver.type = 'button'; volver.className = 'boton'; volver.id = 'volverActual'; volver.textContent = 'Volver al curso ' + est.configReal.cursoActual;
        volver.onclick = function () { verCurso(est.configReal.cursoActual).then(function () { return refrescar(); }); };
        var t = document.createElement('span'); t.textContent = 'Curso ' + est.curso + ' · solo para consultar';
        aviso.appendChild(t); aviso.appendChild(volver);
      }
    };
    est.empezarCurso = async function (nombre) {
      est.configReal = await window.Cursos.empezar(raiz, est.configReal, nombre, est.grupos);
      await verCurso(est.configReal.cursoActual); await refrescar();
    };
    est.deshacerCurso = async function () {
      est.configReal = await window.Cursos.deshacer(raiz, est.configReal);
      await verCurso(est.configReal.cursoActual); await refrescar();
    };
    window.SoloConsulta.vigilar($('principal'), function () { return !est.editable; });
    await verCurso(base.config.cursoActual);
    refrescar = async function () {
      var p = est.paso;
      ['grupos', 'situacion', 'criterio', 'actividad', 'rubrica', 'calificar', 'ajustes'].forEach(function (x) { $('paso' + x.charAt(0).toUpperCase() + x.slice(1)).classList.toggle('activo', p === x); });
      $('pasoActividad').disabled = !(est.criterio || est.actividad);
      $('pasoRubrica').disabled = !est.actividad;
      $('pasoCalificar').disabled = !est.actividad;
      if (p === 'situacion') { await window.PantallaSituacion.pintarSituacion(est, refrescar); return; }
      if (p === 'criterio') { await window.PantallaCriterio.pintarCriterio(est, refrescar); return; }
      if (p === 'actividad') { await window.PantallaActividad.pintarActividad(est, refrescar); return; }
      if (p === 'rubrica') { await window.PantallaRubrica.pintarRubrica(est, refrescar); return; }
      if (p === 'ajustes') { await window.PantallaClaude.pintarAjustes(est, refrescar); return; }
      if (p === 'calificar') { await window.PantallaCalificar.pintarCalificar(est, refrescar); return; }
      est.cuenta = await window.Datos.contarAlumnos(est.carpeta, est.grupos);
      window.Pantalla.pintarGrupos(est, refrescar);
    };
    var ir = function (paso) { return function () { est.paso = paso; refrescar(); }; };
    $('pasoGrupos').onclick = ir('grupos');
    $('pasoSituacion').onclick = ir('situacion');
    $('pasoCriterio').onclick = function () { est.enlace = null; est.paso = 'criterio'; refrescar(); };
    $('pasoActividad').onclick = ir('actividad');
    $('pasoRubrica').onclick = ir('rubrica');
    $('pasoCalificar').onclick = ir('calificar');
    $('pasoAjustes').onclick = ir('ajustes');
    await window.Criterios.cargar();
    await refrescar();
  }

  async function elegirYAbrir() {
    try { await abrir(await window.Carpeta.elegir()); }
    catch (e) { if (e && e.name === 'AbortError') return; window.Pantalla.error(e && e.message ? e.message : String(e)); }
  }

  async function empezar() {
    var h = await window.Carpeta.recordada();
    var texto = 'Elige la carpeta RÚBRICAS de tu Drive (si no existe, créala vacía antes). Aquí guardaré tus grupos, alumnado y calificaciones.';
    if (!h) { window.Pantalla.pedirCarpeta(texto, elegirYAbrir); return; }
    if ((await window.Carpeta.permiso(h)) === 'granted') {
      try { await abrir(h); } catch (e) { window.Pantalla.pedirCarpeta('No he podido abrir la carpeta de siempre. Elígela otra vez.', elegirYAbrir); }
      return;
    }
    window.Pantalla.pedirCarpeta('Chrome pide confirmar el permiso sobre tu carpeta ' + h.name + '.', async function () {
      if (await window.Carpeta.pedirPermiso(h)) { try { await abrir(h); } catch (e) { window.Pantalla.error(e.message || String(e)); } }
      else window.Pantalla.pedirCarpeta('Sin permiso no puedo abrir la carpeta. Elígela otra vez.', elegirYAbrir);
    }, 'Dar permiso');
  }
  empezar();
})();
