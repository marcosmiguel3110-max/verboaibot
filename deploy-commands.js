'use strict';

require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('channelai')
    .setDescription('Elegí en qué canales quieres que Verbo Bot hable automáticamente.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('recuerda')
    .setDescription('Pedile a Verbo Bot que recuerde algo sobre vos.')
    .addStringOption((opt) =>
      opt.setName('dato').setDescription('Lo que querés que recuerde (ej: "me gusta el fútbol")').setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('olvidame')
    .setDescription('Borra lo que Verbo Bot recuerda sobre vos (historial y datos guardados).')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('creditos')
    .setDescription('Muestra los créditos restantes del token de Verbo AI.')
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    if (!process.env.CLIENT_ID) {
      console.error('❌ Falta CLIENT_ID en el .env');
      process.exit(1);
    }

    if (process.env.GUILD_ID) {
      // Registro rápido (instantáneo) en un solo servidor, ideal para pruebas.
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Comandos registrados en el servidor ${process.env.GUILD_ID}`);
    } else {
      // Registro global (puede tardar hasta ~1 hora en propagarse a todos los servidores).
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log('✅ Comandos registrados globalmente');
    }
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
  }
})();
