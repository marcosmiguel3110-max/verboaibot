'use strict';

const mongoose = require('mongoose');

const HISTORY_MAX_TURNOS = 6; // cuántos intercambios recientes recordamos por usuario
const FACTS_MAX = 20; // cuántos "datos aprendidos" guardamos por usuario

// ---------- MongoDB Schemas ----------

const GuildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  channels: [{ type: String }],
});

const UserMemorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  nombre: String,
  historial: [{
    usuario: String,
    ia: String,
  }],
  datos: [String],
});

const Guild = mongoose.model('Guild', GuildSchema);
const UserMemory = mongoose.model('UserMemory', UserMemorySchema);

// ---------- Conexión a MongoDB ----------

let isConnected = false;

async function connectToMongo() {
  if (isConnected) return;
  
  const mongoUrl = process.env.MONGODB_URI;
  if (!mongoUrl) {
    console.warn('⚠️ MONGODB_URI no está definido. Usando modo sin persistencia.');
    return;
  }

  try {
    await mongoose.connect(mongoUrl);
    isConnected = true;
    console.log('✅ Conectado a MongoDB');
  } catch (err) {
    console.error('❌ Error conectando a MongoDB:', err);
  }
}

// ---------- Canales activos por servidor ----------

async function getActiveChannels(guildId) {
  if (!isConnected) return [];
  
  try {
    const guild = await Guild.findOne({ guildId });
    return guild ? guild.channels : [];
  } catch (err) {
    console.error('Error obteniendo canales:', err);
    return [];
  }
}

async function setActiveChannels(guildId, channelIds) {
  if (!isConnected) return;
  
  try {
    await Guild.findOneAndUpdate(
      { guildId },
      { channels: channelIds },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Error guardando canales:', err);
  }
}

async function isChannelActive(guildId, channelId) {
  const channels = await getActiveChannels(guildId);
  return channels.includes(channelId);
}

// ---------- Memoria por usuario ----------

async function getUserMemory(userId) {
  if (!isConnected) return { historial: [], datos: [] };
  
  try {
    const memory = await UserMemory.findOne({ userId });
    return memory ? { historial: memory.historial, datos: memory.datos } : { historial: [], datos: [] };
  } catch (err) {
    console.error('Error obteniendo memoria:', err);
    return { historial: [], datos: [] };
  }
}

async function addExchange(userId, nombre, preguntaUsuario, respuestaIA) {
  if (!isConnected) return;
  
  try {
    const memory = await UserMemory.findOneAndUpdate(
      { userId },
      {
        nombre,
        $push: {
          historial: { usuario: preguntaUsuario, ia: respuestaIA }
        }
      },
      { upsert: true, new: true }
    );
    
    // Mantener solo los últimos HISTORY_MAX_TURNOS
    if (memory.historial.length > HISTORY_MAX_TURNOS) {
      memory.historial = memory.historial.slice(-HISTORY_MAX_TURNOS);
      await memory.save();
    }
  } catch (err) {
    console.error('Error guardando intercambio:', err);
  }
}

async function addFact(userId, nombre, dato) {
  if (!isConnected) return;
  
  try {
    const memory = await UserMemory.findOneAndUpdate(
      { userId },
      {
        nombre,
        $push: {
          datos: dato
        }
      },
      { upsert: true, new: true }
    );
    
    // Mantener solo los últimos FACTS_MAX
    if (memory.datos.length > FACTS_MAX) {
      memory.datos = memory.datos.slice(-FACTS_MAX);
      await memory.save();
    }
  } catch (err) {
    console.error('Error guardando dato:', err);
  }
}

async function deleteUserMemory(userId) {
  if (!isConnected) return;
  
  try {
    await UserMemory.deleteOne({ userId });
  } catch (err) {
    console.error('Error borrando memoria:', err);
  }
}

module.exports = {
  connectToMongo,
  getActiveChannels,
  setActiveChannels,
  isChannelActive,
  getUserMemory,
  addExchange,
  addFact,
  deleteUserMemory,
};
