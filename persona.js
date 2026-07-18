'use strict';

const { getUserMemory } = require('./store');

// Filtro básico de contenido explícito/sexual (defensa adicional, best-effort).
// No es perfecto: es una primera barrera por palabras clave antes de llamar a la IA.
const PALABRAS_BLOQUEADAS = [
  'porno', 'pornografia', 'pornografía', 'xxx', 'contenido sexual explicito',
  'contenido sexual explícito', 'nsfw', 'desnudo explicito', 'sexo explicito',
];

function contieneContenidoProhibido(texto) {
  const t = texto.toLowerCase();
  return PALABRAS_BLOQUEADAS.some((p) => t.includes(p));
}

const RESPUESTA_RECHAZO =
  '🚫 No puedo ayudar con ese tipo de contenido. ¡Pero con gusto charlamos de otra cosa!';

/**
 * Arma el mensaje final que se envía a la API de Verbo AI, incluyendo:
 * - la "personalidad" del bot
 * - el historial reciente de la conversación con ese usuario
 * - datos que el usuario pidió recordar
 * - el mensaje nuevo del usuario
 */
function construirMensaje(userId, nombreUsuario, mensajeNuevo) {
  const mem = getUserMemory(userId);

  let contexto = `Sos "Verbo Bot", un asistente de Discord amigable, cercano y respetuoso. `
    + `Saludás con calidez, respondés cualquier duda o tema (excepto contenido sexual explícito o pornográfico, `
    + `eso lo rechazás amablemente), y tratás de recordar cosas que la gente te cuenta para sonar más natural. `
    + `Respondé de forma breve y natural, como en un chat de Discord (no uses formato de carta ni firmes el mensaje). `
    + `Estás hablando con el usuario de Discord llamado "${nombreUsuario}".`;

  if (mem.datos && mem.datos.length > 0) {
    contexto += `\n\nCosas que sabés sobre ${nombreUsuario} (porque él/ella te las contó antes): `
      + mem.datos.join('; ') + '.';
  }

  if (mem.historial && mem.historial.length > 0) {
    const historialTexto = mem.historial
      .map((h) => `${nombreUsuario}: ${h.usuario}\nVerbo Bot: ${h.ia}`)
      .join('\n');
    contexto += `\n\nEsto es lo último que hablaron:\n${historialTexto}`;
  }

  contexto += `\n\nAhora ${nombreUsuario} te escribe esto, respondele directamente:\n${mensajeNuevo}`;

  return contexto;
}

module.exports = { construirMensaje, contieneContenidoProhibido, RESPUESTA_RECHAZO };
