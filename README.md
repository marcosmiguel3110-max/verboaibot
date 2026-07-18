# Verbo Bot — Bot de Discord con Verbo AI

Bot de Discord que usa tu token de **Verbo AI** (`verboai-159484692538`):

- **Texto normal** → modelo `NewserLite`
- **Pedidos de imagen** (mensajes que empiezan con "Generame", "Dibujame", "Genera", etc.) → modelo `NewserAdvanced1.5`
- Responde solo en los canales que vos elijas con `/channelai` (dropdown de canales, estilo Nekotina AI).
- Es amigable, saluda, responde de casi cualquier cosa **menos contenido pornográfico/sexual explícito** (lo rechaza con un mensaje amable).
- "Aprende" de la gente: guarda el historial reciente de cada usuario y también podés decirle explícitamente `/recuerda dato:"lo que sea"` (o escribir "recordá que..." directo en el chat) para que lo recuerde en futuras charlas.

## 1. Requisitos

- Node.js 18 o superior.
- Una aplicación de Discord con un bot creado en https://discord.com/developers/applications

## 2. Crear el bot en Discord

1. Entrá a https://discord.com/developers/applications → **New Application**.
2. En **Bot**, hacé clic en **Reset Token** y copiá el token (esto va en `DISCORD_TOKEN`).
3. En la misma pestaña **Bot**, activá el intent **MESSAGE CONTENT INTENT** (imprescindible, si no el bot no puede leer los mensajes normales).
4. En **General Information**, copiá el **Application ID** (esto va en `CLIENT_ID`).
5. En **OAuth2 → URL Generator**, marcá los scopes `bot` y `applications.commands`, y en permisos marcá al menos:
   - Send Messages
   - Read Message History
   - Use Slash Commands
   - Embed Links
6. Abrí la URL generada y agregá el bot a tu servidor.

## 3. Configurar el proyecto

```bash
cp .env.example .env
```

Editá `.env` y completá:

```
DISCORD_TOKEN=el_token_de_tu_bot
CLIENT_ID=el_application_id
GUILD_ID=          # opcional, dejalo vacío salvo que quieras probar en un solo server
VERBOAI_TOKEN=verboai-159484692538
```

Instalá dependencias:

```bash
npm install
```

## 4. Registrar los comandos y arrancar

```bash
npm run deploy-commands
npm start
```

Si pusiste `GUILD_ID` en el `.env`, los comandos aparecen al instante en ese servidor.
Si lo dejaste vacío, se registran globalmente y pueden tardar hasta ~1 hora en aparecer en todos los servidores.

## 5. Uso

- `/channelai` → abre un menú desplegable para elegir en qué canales de texto va a hablar el bot automáticamente (podés elegir varios o ninguno). Requiere permiso de "Administrar servidor".
- Una vez elegido un canal, cualquier mensaje escrito ahí es respondido automáticamente por el bot (sin necesidad de mencionarlo ni usar comandos), igual que Nekotina AI.
- `/recuerda dato:"me gusta el fútbol"` → el bot guarda ese dato para usarlo en charlas futuras con vos.
- `/olvidame` → borra todo lo que el bot recordaba sobre vos.
- `/creditos` → muestra los créditos restantes del token de Verbo AI.

## 6. Despliegue en Fly.io (24/7 gratis)

Para desplegar el bot en Fly.io con persistencia en MongoDB:

1. **Instalar Fly CLI:**
   ```bash
   # En Windows con Chocolatey:
   choco install flyctl
   ```

2. **Iniciar sesión en Fly.io:**
   ```bash
   flyctl auth signup
   flyctl auth login
   ```

3. **Crear la aplicación:**
   ```bash
   flyctl launch
   ```
   - Nombre: `verboaibot`
   - Región: `iad` (Virginia) o la más cercana a tu comunidad

4. **Configurar variables de entorno:**
   ```bash
   flyctl secrets set DISCORD_TOKEN=tu_token_aqui
   flyctl secrets set VERBOAI_TOKEN=tu_verboai_token_aqui
   flyctl secrets set VERBOAI_URL=https://verboai.duckdns.org
   flyctl secrets set MONGODB_URI=mongodb+srv://mmodcat_db_user:<password>@cluster0.sz5kbsv.mongodb.net/?appName=Cluster0
   ```

5. **Desplegar:**
   ```bash
   flyctl deploy
   ```

El bot se ejecutará 24/7 en el plan gratuito de Fly.io con persistencia en MongoDB.

## 7. Notas importantes

- **Rate limits de la API**: `NewserLite` permite 20 pedidos/min, `NewserAdvanced1.5` solo 3 pedidos/min y hasta 2 imágenes/hora. Si mucha gente escribe a la vez en un canal activado, puede aparecer el mensaje de "muchos mensajes seguidos" — es normal, es el límite del token, no un bug del bot.
- El filtro de contenido explícito es una primera barrera por palabras clave; la propia IA (Verbo AI) también tiene la instrucción de rechazar ese tipo de pedidos, pero ningún filtro de este tipo es 100% infalible.
- **Persistencia**: El bot ahora usa MongoDB para guardar la memoria de usuarios y canales activos, lo que permite despliegues en la nube sin perder datos al reiniciar.
- Si en algún momento cambian el dominio o los endpoints de Verbo AI, solo hay que actualizar `VERBOAI_URL` en las variables de entorno.

## 8. Estructura del proyecto

```
verboai-discord-bot/
├── index.js            # Bot principal (comandos + mensajes automáticos)
├── deploy-commands.js  # Registra los slash commands en Discord
├── verboai.js           # Cliente de la API de Verbo AI
├── persona.js           # Personalidad del bot + filtro básico de contenido
├── store.js             # Memoria persistente (canales activos, historial, datos)
├── data/                # (ya no se usa, ahora MongoDB)
├── .env.example
├── fly.toml             # Configuración para Fly.io
└── package.json
```
