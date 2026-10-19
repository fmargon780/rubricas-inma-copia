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
    var est = { carpeta: carpeta, grupos: base.grupos, cuenta: {}, grupo: null, area: null, paso: 'grupos', criterio: null };
    var refrescar = async function () {
      var p = est.paso;
      $('pasoGrupos').classList.toggle('activo', p === 'grupos');
      $('pasoCriterio').classList.toggle('activo', p === 'criterio');
      $('pasoActividad').classList.toggle('activo', p === 'actividad');
      $('pasoActividad').disabled = p !== 'actividad';
      if (p === 'criterio') { await window.PantallaCriterio.pintarCriterio(est, refrescar); return; }
      if (p === 'actividad') { window.PantallaCriterio.pintarActividad(est, refrescar); return; }
      est.cuenta = await window.Datos.contarAlumnos(carpeta, est.grupos);
      window.Pantalla.pintarGrupos(est, refrescar);
    };
    $('pasoGrupos').onclick = function () { est.paso = 'grupos'; refrescar(); };
    $('pasoCriterio').onclick = function () { est.paso = 'criterio'; refrescar(); };
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
