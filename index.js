'use strict';

require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelSelectMenuBuilder,
  ChannelType,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');

const { preguntarVerboAI, esPedidoDeImagen } = require('./verboai');
const { construirMensaje, contieneContenidoProhibido, RESPUESTA_RECHAZO } = require('./persona');
const {
  getActiveChannels,
  setActiveChannels,
  isChannelActive,
  addExchange,
  addFact,
} = require('./store');

const MODELO_TEXTO = 'NewserLite';
const MODELO_IMAGEN = 'NewserAdvanced1.5';
const VERBOAI_URL = process.env.VERBOAI_URL || 'https://verboai.duckdns.org';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once('clientReady', () => {
  console.log(`🤖 Conectado como ${client.user.tag}`);
});

// ------------------------------------------------------------------
// Slash commands
// ------------------------------------------------------------------
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await manejarSlashCommand(interaction);
    } else if (interaction.isChannelSelectMenu() && interaction.customId === 'channelai_select') {
      await manejarSeleccionCanales(interaction);
    }
  } catch (err) {
    console.error('Error manejando interacción:', err);
    const payload = { content: '⚠️ Ocurrió un error inesperado. Probá de nuevo en un rato.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

async function manejarSlashCommand(interaction) {
  const { commandName } = interaction;

  if (commandName === 'channelai') {
    const actuales = getActiveChannels(interaction.guildId);
    const select = new ChannelSelectMenuBuilder()
      .setCustomId('channelai_select')
      .setPlaceholder('Elegí los canales donde Verbo Bot va a hablar')
      .setChannelTypes(ChannelType.GuildText)
      .setMinValues(0)
      .setMaxValues(25)
      .setDefaultChannels(actuales.slice(0, 25));

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.reply({
      content:
        '📢 Elegí los canales de texto donde querés que **Verbo Bot** responda automáticamente ' +
        '(cuando alguien escriba ahí, sin necesidad de comandos). Podés elegir varios o ninguno.',
      components: [row],
      ephemeral: true,
    });
    return;
  }

  if (commandName === 'recuerda') {
    const dato = interaction.options.getString('dato', true);
    if (contieneContenidoProhibido(dato)) {
      await interaction.reply({ content: RESPUESTA_RECHAZO, ephemeral: true });
      return;
    }
    addFact(interaction.user.id, interaction.user.displayName || interaction.user.username, dato);
    await interaction.reply({
      content: `✅ Listo, voy a recordar esto: _"${dato}"_`,
      ephemeral: true,
    });
    return;
  }

  if (commandName === 'olvidame') {
    const fs = require('fs');
    const path = require('path');
    const memPath = path.join(__dirname, 'data', 'memory.json');
    try {
      const data = JSON.parse(fs.readFileSync(memPath, 'utf8'));
      delete data[interaction.user.id];
      fs.writeFileSync(memPath, JSON.stringify(data, null, 2));
    } catch {
      /* si no existe el archivo, no hay nada que borrar */
    }
    await interaction.reply({ content: '🧹 Listo, borré todo lo que recordaba sobre vos.', ephemeral: true });
    return;
  }

  if (commandName === 'creditos') {
    await interaction.deferReply({ ephemeral: true });
    try {
      const resp = await fetch(`${VERBOAI_URL}/api/v1/creditos`, {
        headers: { Authorization: `Bearer ${process.env.VERBOAI_TOKEN}` },
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || 'error desconocido');
      const embed = new EmbedBuilder()
        .setTitle('💳 Créditos de Verbo AI')
        .addFields(
          { name: 'Restantes', value: String(data.creditos), inline: true },
          { name: 'Iniciales', value: String(data.creditosIniciales), inline: true }
        )
        .setColor(0x6b46c1);
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply(`⚠️ No pude consultar los créditos: ${err.message}`);
    }
    return;
  }
}

async function manejarSeleccionCanales(interaction) {
  const canalesElegidos = interaction.values; // array de IDs de canal
  setActiveChannels(interaction.guildId, canalesElegidos);

  if (canalesElegidos.length === 0) {
    await interaction.update({
      content: '🔇 Listo, desactivé a Verbo Bot en todos los canales de este servidor.',
      components: [],
    });
    return;
  }

  const lista = canalesElegidos.map((id) => `<#${id}>`).join(', ');
  await interaction.update({
    content: `✅ Verbo Bot ahora va a responder automáticamente en: ${lista}`,
    components: [],
  });
}

// ------------------------------------------------------------------
// Mensajes normales en canales activados
// ------------------------------------------------------------------
client.on('messageCreate', async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.guildId) return; // por ahora solo servidores, no DMs
    if (!isChannelActive(message.guildId, message.channelId)) return;
    if (!message.content || message.content.trim().length === 0) return;

    const texto = message.content.trim();
    const nombreUsuario = message.member?.displayName || message.author.username;

    if (contieneContenidoProhibido(texto)) {
      await message.reply(RESPUESTA_RECHAZO);
      return;
    }

    await message.channel.sendTyping();

    // "Recuerda que..." dicho directamente en el chat también guarda un dato.
    const matchRecuerda = texto.match(/^recorda(?:me)?\s+que\s+(.+)/i) || texto.match(/^recuerda(?:me)?\s+que\s+(.+)/i);
    if (matchRecuerda) {
      addFact(message.author.id, nombreUsuario, matchRecuerda[1].trim());
    }

    const esImagen = esPedidoDeImagen(texto);
    const modelo = esImagen ? MODELO_IMAGEN : MODELO_TEXTO;
    const mensajeCompleto = construirMensaje(message.author.id, nombreUsuario, texto);

    const data = await preguntarVerboAI(mensajeCompleto, modelo);

    addExchange(message.author.id, nombreUsuario, texto, data.respuesta);

    if (data.imagen && data.imagen.url) {
      const urlImagen = `${VERBOAI_URL}${data.imagen.url}`;
      const embed = new EmbedBuilder()
        .setDescription(data.respuesta || 'Acá tenés tu imagen 🎨')
        .setImage(urlImagen)
        .setColor(0x6b46c1);
      await message.reply({ embeds: [embed] });
    } else {
      await enviarRespuestaLarga(message, data.respuesta);
    }
  } catch (err) {
    console.error('Error respondiendo mensaje:', err);
    if (err.status === 429) {
      await message.reply('⏳ Che, muchos mensajes seguidos. Dame un segundo y probá de nuevo.').catch(() => {});
    } else if (err.status === 402) {
      await message.reply('💳 Se acabaron los créditos del token de Verbo AI por ahora.').catch(() => {});
    } else {
      await message.reply('⚠️ Tuve un problema respondiendo. Probá de nuevo en un ratito.').catch(() => {});
    }
  }
});

async function enviarRespuestaLarga(message, texto) {
  const LIMITE = 1900;
  if (!texto) {
    await message.reply('🤔 No obtuve respuesta, probá reformular tu mensaje.');
    return;
  }
  if (texto.length <= LIMITE) {
    await message.reply(texto);
    return;
  }
  for (let i = 0; i < texto.length; i += LIMITE) {
    const parte = texto.slice(i, i + LIMITE);
    if (i === 0) {
      await message.reply(parte);
    } else {
      await message.channel.send(parte);
    }
  }
}

client.login(process.env.DISCORD_TOKEN);
