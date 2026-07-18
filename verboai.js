'use strict';

const VERBOAI_URL = process.env.VERBOAI_URL || 'https://verboai.duckdns.org';
const VERBOAI_TOKEN = process.env.VERBOAI_TOKEN;

// Verbos que la API de Verbo AI detecta como "pedido de imagen"
// (ver info.html: "Generame", "Genera", "Dibujame", etc.)
const IMAGE_TRIGGERS = [
  'generame', 'genera', 'dibujame', 'dibuja', 'crea una imagen',
  'creame una imagen', 'hazme una imagen', 'imagina', 'ilustra'
];

function esPedidoDeImagen(texto) {
  const t = texto.trim().toLowerCase();
  return IMAGE_TRIGGERS.some((v) => t.startsWith(v));
}

/**
 * Llama a POST /api/v1/chat
 * @param {string} mensaje - el mensaje completo (incluye persona + contexto + pregunta)
 * @param {string} modelo - "NewserLite" | "NewserAdvanced" | "NewserAdvanced1.5"
 */
async function preguntarVerboAI(mensaje, modelo = 'NewserLite') {
  if (!VERBOAI_TOKEN) {
    throw new Error('Falta VERBOAI_TOKEN en las variables de entorno.');
  }

  const resp = await fetch(`${VERBOAI_URL}/api/v1/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VERBOAI_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mensaje, modelo }),
  });

  let data;
  try {
    data = await resp.json();
  } catch {
    throw new Error(`Respuesta inválida de Verbo AI (status ${resp.status}).`);
  }

  if (!resp.ok || !data.ok) {
    const err = data && data.error ? data.error : `HTTP ${resp.status}`;
    const e = new Error(err);
    e.status = resp.status;
    throw e;
  }

  return data;
}

module.exports = { preguntarVerboAI, esPedidoDeImagen };
