/* Arranque: recuerda la carpeta entre visitas, la abre y pinta «Mis grupos». */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var DESDE_DISCO = location.protocol === 'file:';
  $('versionPagina').textContent = window.VERSION_PAGINA + ' · ' + (window.COMMIT_PAGINA || 'sin-marca') + (DESDE_DISCO ? ' · copia sin internet' : '');

  async function abrir(handle) {
    var carpeta = window.Carpeta.adaptador(handle);
    $('estadoCarpeta').textContent = 'Carpeta: ' + handle.name;
    var base = await window.Datos.iniciar(carpeta);
    var est = { carpeta: carpeta, config: base.config, grupos: base.grupos, actividad: null, rubrica: null, cuenta: {}, grupo: null, area: null, paso: 'grupos', criterio: null };
    var refrescar = async function () {
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
      est.cuenta = await window.Datos.contarAlumnos(carpeta, est.grupos);
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
