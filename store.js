'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const CHANNELS_FILE = path.join(DATA_DIR, 'channels.json');
const MEMORY_FILE = path.join(DATA_DIR, 'memory.json');

const HISTORY_MAX_TURNOS = 6; // cuántos intercambios recientes recordamos por usuario
const FACTS_MAX = 20; // cuántos "datos aprendidos" guardamos por usuario

function ensureFile(file, defaultValue) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
  }
}

function readJSON(file, defaultValue) {
  ensureFile(file, defaultValue);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return defaultValue;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------- Canales activos por servidor ----------
// estructura: { "<guildId>": ["<channelId>", ...] }

function getChannelsData() {
  return readJSON(CHANNELS_FILE, {});
}

function getActiveChannels(guildId) {
  const data = getChannelsData();
  return data[guildId] || [];
}

function setActiveChannels(guildId, channelIds) {
  const data = getChannelsData();
  data[guildId] = channelIds;
  writeJSON(CHANNELS_FILE, data);
}

function isChannelActive(guildId, channelId) {
  return getActiveChannels(guildId).includes(channelId);
}

// ---------- Memoria por usuario ----------
// estructura: { "<userId>": { nombre, historial: [{rol, texto}], datos: ["dato1", ...] } }

function getMemoryData() {
  return readJSON(MEMORY_FILE, {});
}

function saveMemoryData(data) {
  writeJSON(MEMORY_FILE, data);
}

function getUserMemory(userId) {
  const data = getMemoryData();
  return data[userId] || { historial: [], datos: [] };
}

function addExchange(userId, nombre, preguntaUsuario, respuestaIA) {
  const data = getMemoryData();
  if (!data[userId]) data[userId] = { historial: [], datos: [] };
  data[userId].nombre = nombre;
  data[userId].historial.push({ usuario: preguntaUsuario, ia: respuestaIA });
  if (data[userId].historial.length > HISTORY_MAX_TURNOS) {
    data[userId].historial = data[userId].historial.slice(-HISTORY_MAX_TURNOS);
  }
  saveMemoryData(data);
}

function addFact(userId, nombre, dato) {
  const data = getMemoryData();
  if (!data[userId]) data[userId] = { historial: [], datos: [] };
  data[userId].nombre = nombre;
  data[userId].datos.push(dato);
  if (data[userId].datos.length > FACTS_MAX) {
    data[userId].datos = data[userId].datos.slice(-FACTS_MAX);
  }
  saveMemoryData(data);
}

module.exports = {
  getActiveChannels,
  setActiveChannels,
  isChannelActive,
  getUserMemory,
  addExchange,
  addFact,
};
