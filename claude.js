/* Claude (API de Anthropic) desde la página: la clave, la llamada y las dos propuestas (actividad y rúbrica) con forma fija.
   Sin pantalla: sirve en el navegador y en las pruebas. A Claude solo van criterio, área, curso e ideas de Inma; NUNCA nombres de alumnos. */
(function (g) {
  'use strict';

  var MODELO = 'claude-sonnet-5-5'; /* el único sitio donde se escribe el modelo */
  var URL_API = 'https://api.anthropic.com/v1/messages';
  var FICHERO_CLAVE = 'clave.json';
  var NIVELES = ['Insuficiente', 'Suficiente', 'Bien', 'Notable', 'Sobresaliente'];

  function ErrorClaude(codigo, mensaje) { var e = new Error(mensaje); e.codigo = codigo; return e; }

  /* La clave vive en la carpeta de Inma (clave.json), nunca en el programa. */
  async function leerClave(carpeta) { var d = await carpeta.leerJSON(FICHERO_CLAVE); return d && typeof d.clave === 'string' ? d.clave.trim() : ''; }
  function guardarClave(carpeta, clave) {
    clave = String(clave || '').trim();
    if (!/^sk-ant-[\w-]{10,}$/.test(clave)) throw new Error('Esa clave no parece buena: tiene que empezar por «sk-ant-». Cópiala entera.');
    return carpeta.escribirJSON(FICHERO_CLAVE, { clave: clave });
  }
  function quitarClave(carpeta) { return carpeta.escribirJSON(FICHERO_CLAVE, { clave: '' }); }

  function sinTildes(t) { return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ]+/g, ' ').trim(); }
  /* Falla si el texto lleva el nombre de algún alumno (tal como está guardado, «Apellidos, Nombre», o «Nombre Apellidos»). */
  function vigilarNombres(texto, nombres) {
    var t = ' ' + sinTildes(texto) + ' ';
    (nombres || []).forEach(function (n) {
      var partes = String(n).split(','), variantes = [sinTildes(n)];
      if (partes.length === 2) variantes.push(sinTildes(partes[1] + ' ' + partes[0]));
      variantes.forEach(function (v) {
        if (v.length >= 5 && t.indexOf(' ' + v + ' ') >= 0) throw ErrorClaude('nombres', 'Tu texto lleva el nombre de un alumno («' + n + '»). Quítalo: a Claude no se le mandan nombres de niños.');
      });
    });
  }

  var SISTEMA = 'Eres un ayudante de una maestra de Primaria de Andalucía (CEIP, 3.º y 4.º). Hablas en español sencillo y práctico, con ideas que se puedan hacer en un aula real. ' +
    'Te doy el criterio de evaluación oficial (literal), el área, el curso y la idea de la maestra. Nunca hay nombres de alumnos: no los inventes ni los pidas. ' +
    'Si el área es Educación Artística, la maestra es de Música: piensa en música (ritmo, voz, instrumentos del aula, audición, creación), salvo que su idea diga otra cosa. ' +
    'Respondes SOLO con un objeto JSON válido, sin texto antes ni después y sin bloques de código.';

  function textoCriterios(criterios) { return criterios.map(function (c) { return '- ' + c.codigo + ': ' + c.texto; }).join('\n'); }
  function contexto(c) { return 'Área: ' + c.area + '\nCurso: ' + c.curso + '.º de Primaria\nCriterio(s) de evaluación (texto oficial):\n' + textoCriterios(c.criterios); }

  var FORMA_ACTIVIDAD = '{"titulo": "…", "duracion": "por ejemplo 2 sesiones de 45 minutos", "sesiones": número de sesiones (1 a 12), "producto": "producto final", "materiales": "materiales", ' +
    '"pasos": [{"texto": "qué se hace en la sesión", "minutos": número}], "porque": "por qué encaja con el criterio, en una o dos frases"}. "pasos" tiene exactamente "sesiones" elementos.';
  var FORMA_RUBRICA = '{"filas": [{"texto": "qué se mira", "peso": 1, "celdas": ["Insuficiente", "Suficiente", "Bien", "Notable", "Sobresaliente"]}]}. ' +
    'De 3 a 5 filas; cada fila lleva exactamente 5 textos en celdas, uno por nivel en ese orden (' + NIVELES.join(', ') + '), con lo que tiene que pasar en cada nivel, en frases cortas y observables.';

  function pedirActividad(c) {
    var m = contexto(c) + '\n\nIdea de la maestra: ' + c.idea;
    if (c.anterior && c.cambios) m += '\n\nPropuesta anterior:\n' + JSON.stringify(c.anterior) + '\n\nCambios que pide la maestra: ' + c.cambios + '\nDevuelve la propuesta completa con esos cambios.';
    return m + '\n\nDevuelve este JSON: ' + FORMA_ACTIVIDAD;
  }
  function pedirRubrica(c) {
    var a = c.actividad;
    return contexto(c) + '\n\nActividad: ' + a.titulo + '. Producto final: ' + a.producto + '. Materiales: ' + a.materiales + '.\nPasos:\n' +
      a.pasos.map(function (p, i) { return (i + 1) + '. ' + p; }).join('\n') + '\n\nCrea la rúbrica de esta actividad. Devuelve este JSON: ' + FORMA_RUBRICA;
  }

  function trozoJSON(texto) {
    var t = String(texto || '').replace(/```(?:json)?/gi, ''), a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a < 0 || b <= a) throw new Error('no hay JSON');
    return JSON.parse(t.slice(a, b + 1));
  }
  function cadena(x, nombre) { if (typeof x !== 'string' || !x.trim()) throw new Error('falta ' + nombre); return x.trim(); }

  function validarActividad(o) {
    var n = Number(o.sesiones);
    if (!isFinite(n) || n < 1 || n > 12) throw new Error('sesiones');
    n = Math.round(n);
    if (!Array.isArray(o.pasos) || o.pasos.length < 1) throw new Error('pasos');
    var pasos = o.pasos.slice(0, n).map(function (p) {
      var txt = cadena(typeof p === 'string' ? p : p && p.texto, 'paso'), min = p && Number(p.minutos);
      return min > 0 ? txt + ' (' + Math.round(min) + ' min)' : txt;
    });
    while (pasos.length < n) pasos.push('');
    return { titulo: cadena(o.titulo, 'título'), duracion: cadena(o.duracion, 'duración'), sesiones: n, producto: cadena(o.producto, 'producto'),
      materiales: cadena(o.materiales, 'materiales'), pasos: pasos, porque: cadena(o.porque, 'porque') };
  }
  function validarRubrica(o) {
    if (!Array.isArray(o.filas) || o.filas.length < 1 || o.filas.length > 8) throw new Error('filas');
    return o.filas.map(function (f) {
      if (!Array.isArray(f.celdas) || f.celdas.length !== 5) throw new Error('celdas');
      var peso = Number(f.peso);
      return { texto: cadena(f.texto, 'texto'), peso: isFinite(peso) && peso > 0 ? peso : 1, celdas: f.celdas.map(function (x) { return cadena(x, 'celda'); }) };
    });
  }

  /* Una llamada a la API. `ajustes.fetch` permite poner una API de mentira en las pruebas. */
  async function llamar(clave, mensaje, ajustes) {
    if (!clave) throw ErrorClaude('sin-clave', 'Falta la clave de Claude. Pégala una vez en «Ajustes».');
    var f = (ajustes && ajustes.fetch) || g.fetch.bind(g), r;
    try {
      r = await f(URL_API, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': clave, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: MODELO, max_tokens: 4000, system: SISTEMA, messages: [{ role: 'user', content: mensaje }] }) });
    } catch (e) { throw ErrorClaude('red', 'No he podido hablar con Claude. Mira si hay internet (la red del colegio puede bloquearlo).'); }
    if (r.status === 401 || r.status === 403) throw ErrorClaude('clave', 'Claude no acepta la clave. Revísala en «Ajustes».');
    if (r.status === 429 || r.status === 529) throw ErrorClaude('ocupado', 'Claude está ocupado o se ha llegado al tope de gasto. Prueba dentro de un rato.');
    if (!r.ok) throw ErrorClaude('api', 'Claude ha dado un error (' + r.status + '). Prueba otra vez.');
    var d = await r.json();
    return (d.content || []).map(function (x) { return x.text || ''; }).join('');
  }

  /* Pide, valida y, si la respuesta llega mal, reintenta UNA vez. Si sigue mal, avisa sin tocar lo que Inma tenía escrito. */
  async function pedir(clave, mensaje, validar, ajustes) {
    for (var intento = 0; intento < 2; intento++) {
      var texto = await llamar(clave, mensaje, ajustes);
      try { return validar(trozoJSON(texto)); } catch (e) { /* respuesta mal formada: otro intento */ }
    }
    throw ErrorClaude('forma', 'Claude no ha contestado de forma que yo la entienda. Prueba otra vez; lo que escribiste sigue ahí.');
  }

  /* c: { area, curso, criterios: [{codigo, texto}], idea, anterior?, cambios? }.  `nombres`: los de los niños, solo para vigilar que no se cuele. */
  async function proponerActividad(clave, c, nombres, ajustes) {
    vigilarNombres([c.idea, c.cambios, c.anterior ? JSON.stringify(c.anterior) : ''].join(' '), nombres);
    return pedir(clave, pedirActividad(c), validarActividad, ajustes);
  }
  async function proponerRubrica(clave, c, nombres, ajustes) {
    vigilarNombres([c.actividad.titulo, c.actividad.producto, c.actividad.materiales].concat(c.actividad.pasos).join(' '), nombres);
    return pedir(clave, pedirRubrica(c), validarRubrica, ajustes);
  }

  /* Situación de Aprendizaje. c: { curso, areas: [{id, nombre}], criterios: [{id, area, codigo, texto}], idea, anterior?, cambios? }.
     Los criterios que Claude puede elegir son SOLO los de la lista; lo que no esté en ella se descarta. */
  var FORMA_SITUACION = '{"titulo": "…", "semanas": número (1 a 12), "sesiones": número total de sesiones (1 a 40), "producto": "producto final", "recursos": "materiales y recursos", ' +
    '"criterios": ["id exacto de la lista"], "actividades": [{"titulo": "…", "area": "id de área de la lista", "sesiones": número, "criterio": "id exacto de la lista"}]}. ' +
    'Entre 3 y 8 actividades. Usa solo ids de criterio de la lista, tal cual están escritos.';
  function pedirSituacion(c) {
    var m = 'Curso: ' + c.curso + '.º de Primaria\nÁreas de la maestra en este grupo: ' + c.areas.map(function (a) { return a.id + ' (' + a.nombre + ')'; }).join(', ') +
      '\nCriterios de evaluación oficiales que puedes elegir (id: texto literal):\n' + c.criterios.map(function (k) { return '- ' + k.id + ': ' + k.texto; }).join('\n') +
      '\n\nReto de la maestra: ' + c.idea + '\nPropón una Situación de Aprendizaje: un reto de la vida real con varias actividades, que puede mezclar áreas, y un producto final.';
    if (c.anterior && c.cambios) m += '\n\nPropuesta anterior:\n' + JSON.stringify(c.anterior) + '\n\nCambios que pide la maestra: ' + c.cambios + '\nDevuelve la propuesta completa con esos cambios.';
    return m + '\n\nDevuelve este JSON: ' + FORMA_SITUACION;
  }
  /* Devuelve la situación y, aparte, los criterios inventados que se han descartado (para avisar a la maestra). */
  function validarSituacion(o, c) {
    var validos = {}, areas = {}, descartados = [];
    c.criterios.forEach(function (k) { validos[k.id] = k; }); c.areas.forEach(function (a) { areas[a.id] = 1; });
    var limpio = function (id) {
      id = String(id == null ? '' : id).trim();
      if (validos[id]) return id;
      descartados.push(id); return '';
    };
    var semanas = Math.round(Number(o.semanas)), sesiones = Math.round(Number(o.sesiones));
    if (!(semanas >= 1 && semanas <= 12) || !(sesiones >= 1 && sesiones <= 40)) throw new Error('duración');
    if (!Array.isArray(o.criterios) || !Array.isArray(o.actividades) || !o.actividades.length) throw new Error('actividades');
    var criterios = [];
    o.criterios.forEach(function (id) { id = limpio(id); if (id && criterios.indexOf(id) < 0) criterios.push(id); });
    var acts = o.actividades.slice(0, 12).map(function (a) {
      var crit = limpio(a.criterio), n = Math.round(Number(a.sesiones));
      if (crit && criterios.indexOf(crit) < 0) criterios.push(crit);
      var area = areas[a.area] ? a.area : (crit ? validos[crit].area : '');
      return { titulo: cadena(a.titulo, 'título de actividad'), area: area, sesiones: n >= 1 && n <= 40 ? n : 1, criterio: crit };
    });
    if (!criterios.length) throw new Error('criterios');
    return { situacion: { titulo: cadena(o.titulo, 'título'), semanas: semanas, sesiones: sesiones, producto: cadena(o.producto, 'producto'),
      recursos: typeof o.recursos === 'string' ? o.recursos.trim() : '', criterios: criterios, actividades: acts }, descartados: descartados.filter(Boolean) };
  }
  async function proponerSituacion(clave, c, nombres, ajustes) {
    vigilarNombres([c.idea, c.cambios, c.anterior ? JSON.stringify(c.anterior) : ''].join(' '), nombres);
    return pedir(clave, pedirSituacion(c), function (o) { return validarSituacion(o, c); }, ajustes);
  }

  var api = { MODELO: MODELO, leerClave: leerClave, guardarClave: guardarClave, quitarClave: quitarClave, vigilarNombres: vigilarNombres,
    proponerActividad: proponerActividad, proponerRubrica: proponerRubrica, proponerSituacion: proponerSituacion };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else g.Claude = api;
})(typeof window !== 'undefined' ? window : globalThis);
