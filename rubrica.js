/* La lógica de rúbricas y notas, sin pantalla: sirve en el navegador y en las pruebas de Node.
   Rúbrica: { id, actividad, nombre, filas: [{ id, texto, peso, celdas: [5 textos] }] }. Las notas de un alumno: { filaId: nivel 0..4 }. */
(function (g) {
  'use strict';

  var NIVELES = [
    { nombre: 'Insuficiente', valor: 3 }, { nombre: 'Suficiente', valor: 5 }, { nombre: 'Bien', valor: 6 },
    { nombre: 'Notable', valor: 8 }, { nombre: 'Sobresaliente', valor: 10 }
  ];
  var CORTOS = ['Ins', 'Sufi', 'Bien', 'Not', 'Sobre'];

  function nuevoId(prefijo) { return prefijo + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function copia(x) { return JSON.parse(JSON.stringify(x)); }

  function filaNueva(texto) { return { id: nuevoId('f'), texto: texto || '', peso: 1, celdas: ['', '', '', '', ''] }; }
  function rubricaNueva(actividad, nombre, nFilas) {
    var filas = [];
    for (var i = 0; i < (nFilas == null ? 3 : nFilas); i++) filas.push(filaNueva(''));
    return { id: nuevoId('r'), actividad: actividad, nombre: nombre || '', filas: filas };
  }
  /* Una copia lista para otra actividad: mismos textos y pesos, identificadores nuevos. */
  function copiarRubrica(r, actividad, nombre) {
    var c = copia(r);
    c.id = nuevoId('r'); c.actividad = actividad; c.nombre = nombre || r.nombre; delete c.plantilla;
    c.filas.forEach(function (f) { f.id = nuevoId('f'); });
    return c;
  }

  function anadirFila(r) { var c = copia(r); c.filas.push(filaNueva('')); return c; }
  function quitarFila(r, fid) { var c = copia(r); c.filas = c.filas.filter(function (f) { return f.id !== fid; }); return c; }
  function moverFila(r, fid, delta) {
    var c = copia(r), i = c.filas.findIndex(function (f) { return f.id === fid; }), j = i + delta;
    if (i < 0 || j < 0 || j >= c.filas.length) return c;
    var t = c.filas[i]; c.filas[i] = c.filas[j]; c.filas[j] = t;
    return c;
  }
  function ponerPeso(r, fid, peso) {
    var p = Number(String(peso).replace(',', '.'));
    if (!isFinite(p) || p <= 0) throw new Error('El peso tiene que ser un número mayor que cero.');
    var c = copia(r); c.filas.forEach(function (f) { if (f.id === fid) f.peso = p; }); return c;
  }
  /* Valores de los cinco niveles escritos por Inma → lista de números (o error con un mensaje claro). */
  function validarValores(textos) {
    if (textos.length !== 5) throw new Error('Tienen que ser cinco niveles.');
    return textos.map(function (t) {
      var v = Number(String(t).replace(',', '.'));
      if (String(t).trim() === '' || !isFinite(v) || v < 0 || v > 10) throw new Error('El valor de cada nivel es un número entre 0 y 10.');
      return v;
    });
  }

  /* Nota (0-10) de un alumno: media ponderada de los valores de los niveles elegidos. Solo cuentan las filas ya calificadas. */
  function nota(r, valores, eleccion) {
    var suma = 0, pesos = 0;
    r.filas.forEach(function (f) {
      var n = eleccion && eleccion[f.id];
      if (typeof n !== 'number' || n < 0 || n > 4) return;
      suma += f.peso * valores[n]; pesos += f.peso;
    });
    return pesos ? suma / pesos : null;
  }
  function completo(r, eleccion) { return r.filas.length > 0 && r.filas.every(function (f) { return eleccion && typeof eleccion[f.id] === 'number'; }); }

  /* «Cómo va»: alumnos calificados del todo, media del grupo y la fila con la media más baja. */
  function resumen(r, valores, alumnos, notas) {
    var sumaNotas = 0, n = 0, calificados = 0, porFila = {};
    alumnos.forEach(function (a) {
      var e = notas[a] || {}, v = nota(r, valores, e);
      if (v != null) { sumaNotas += v; n++; }
      if (completo(r, e)) calificados++;
      r.filas.forEach(function (f) {
        if (typeof e[f.id] !== 'number') return;
        porFila[f.id] = porFila[f.id] || { s: 0, c: 0 }; porFila[f.id].s += valores[e[f.id]]; porFila[f.id].c++;
      });
    });
    var floja = null;
    r.filas.forEach(function (f) {
      var p = porFila[f.id]; if (!p) return;
      var m = p.s / p.c;
      if (!floja || m < floja.media) floja = { fila: f.id, texto: f.texto, media: m };
    });
    return { calificados: calificados, total: alumnos.length, media: n ? sumaNotas / n : null, filaFloja: floja };
  }

  function ordenar(nombres) { return nombres.slice().sort(function (a, b) { return a.localeCompare(b, 'es', { sensitivity: 'base' }); }); }
  /* Listado para Séneca: todo el grupo, en orden alfabético, con la nota del criterio (media de las actividades que lo evalúan).
     `notasPorActividad`: lista de { nombre → nota|null }. Sin ninguna nota, la casilla queda vacía. */
  function listadoSeneca(alumnos, notasPorActividad) {
    return ordenar(alumnos).map(function (a) {
      var s = 0, c = 0;
      notasPorActividad.forEach(function (m) { if (typeof m[a] === 'number') { s += m[a]; c++; } });
      return { nombre: a, nota: c ? Math.round(s / c * 10) / 10 : null };
    });
  }
  function dec(n) { return n == null ? '' : String(n).replace('.', ','); }
  function textoListado(filas) { return filas.map(function (f) { return f.nombre + '\t' + dec(f.nota); }).join('\n'); }
  function csvListado(filas) {
    return '﻿' + ['Alumno/a;Nota'].concat(filas.map(function (f) { return '"' + f.nombre.replace(/"/g, '""') + '";' + dec(f.nota); })).join('\r\n') + '\r\n';
  }

  var api = { NIVELES: NIVELES, CORTOS: CORTOS, nuevoId: nuevoId, filaNueva: filaNueva, rubricaNueva: rubricaNueva, copiarRubrica: copiarRubrica,
    anadirFila: anadirFila, quitarFila: quitarFila, moverFila: moverFila, ponerPeso: ponerPeso, validarValores: validarValores,
    nota: nota, completo: completo, resumen: resumen, ordenar: ordenar, listadoSeneca: listadoSeneca, textoListado: textoListado, csvListado: csvListado };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else g.Rubrica = api;
})(typeof window !== 'undefined' ? window : globalThis);
