import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { config } from 'dotenv';
import { isKnown, addJid, countJids } from './db/jids.js';

config();

let sock        = null;
let isConnected = false;

// ─── Estado en memoria ────────────────────────────────────────────────────
// { servicio: null|'punch'|'trico', paso: null|string,
//   datos: {}, visitado: bool, reminderTimer: null }
const sessions = {};

// ─── Helpers ──────────────────────────────────────────────────────────────
const ADMIN_JID = () => {
  const n = process.env.WHATSAPP_ADMIN_NUMBER || '';
  return n.includes('@') ? n : `${n}@s.whatsapp.net`;
};

const LANDING = process.env.BASE_URL || 'http://localhost:3001';

async function enviar(jid, texto) {
  if (!isConnected || !sock) return;
  await sock.sendMessage(jid, { text: texto });
}

async function notificarAdmin(texto) {
  if (!isConnected || !sock) return;
  try { await sock.sendMessage(ADMIN_JID(), { text: texto }); }
  catch (e) { console.error('Error notif admin:', e.message); }
}

function resetSesion(jid) {
  cancelarRecordatorio(jid);
  const v = sessions[jid]?.visitado || false;
  sessions[jid] = { servicio: null, paso: null, datos: {}, visitado: v, reminderTimer: null };
}

function programarRecordatorio(jid) {
  cancelarRecordatorio(jid);
  sessions[jid].reminderTimer = setTimeout(async () => {
    if (sessions[jid]?.paso)
      await enviar(jid, `¿Sigues ahí? Puedes continuar donde lo dejaste o escribir *menú* para empezar de nuevo.`);
  }, 10 * 60 * 1000);
}

function cancelarRecordatorio(jid) {
  if (sessions[jid]?.reminderTimer) {
    clearTimeout(sessions[jid].reminderTimer);
    sessions[jid].reminderTimer = null;
  }
}

// ─── Textos ───────────────────────────────────────────────────────────────

const MENU_PRINCIPAL = `Hola, bienvenido 👋
¿En qué podemos ayudarte hoy?

1️⃣ Instrumental FUE — punch.capilar
2️⃣ Consulta Tricológica — Dr. David Lara`;

// — Punch.capilar —
const PUNCH_MENU = `Hola, bienvenido a *punch.capilar* 🩺
Instrumental FUE de precisión para Ecuador.

Elige una opción:
1️⃣ Ver catálogo y precios
2️⃣ Hacer un pedido
3️⃣ Seguimiento de mi pedido
4️⃣ Preguntas frecuentes
5️⃣ Hablar con un asesor`;

const PUNCH_CATALOGO = `*Catálogo punch.capilar* — Precios con IVA incluido:

🔹 *Portazafiro FUE* — $49.99
   Mango ergonómico de precisión para implante folicular.

🔹 *Hoja Zafiro FUE* — $54.99
   Cortes submilimétricos, biocompatible y duradera.

🔹 *FUE Punch Estándar* — $9.99
   Punta convencional para procedimientos estándar.

🔹 *FUE Punch Elaborado* — $14.99
   Geometría anatómica avanzada, mayor precisión.

🔹 *Kit Completo FUE* — $99.99
   Portazafiro + Hoja Zafiro + Punch Estándar. Ahorras $14.98.

Ver todo en: ${LANDING}

Escribe *2* para hacer un pedido o *menú* para volver.`;

const PUNCH_FAQ = `*Preguntas frecuentes — punch.capilar:*

*1. ¿Realizan envíos a provincias?*
Sí, a todo Ecuador via Servientrega, Laar y Speed. Provincias: 2-4 días hábiles.

*2. ¿Puedo pagar con tarjeta del Pichincha, Produbanco o Diners?*
Sí, aceptamos todas las tarjetas ecuatorianas a través de Payphone.

*3. ¿Emiten factura electrónica con RUC?*
Sí, emitimos factura electrónica válida ante el SRI.

*4. ¿Los instrumentos tienen garantía?*
6 meses contra defectos de fabricación.

*5. ¿Cómo elijo el tamaño de FUE Punch?*
Cabello fino: 0.7-0.8mm · Medio: 0.85-0.95mm · Grueso: 1.0mm

*6. ¿Cuánto tarda el envío a mi ciudad?*
Quito/Guayaquil: 24-48h · Cuenca/Ambato: 2-3 días · Otras provincias: 3-4 días.

Escribe *menú* para volver.`;

// — Tricología —
const TRICO_MENU = `Bienvenido 🩺
*Dr. David Lara — Médico Tricólogo*
Atención en Quito y Riobamba.

1️⃣ Ver tratamientos y precios
2️⃣ Agendar una consulta
3️⃣ Tratamiento médico oral
4️⃣ Trasplante FUE — solo Quito
5️⃣ Volver al menú principal`;

const TRICO_PRECIOS = `📋 *Servicios — Dr. David Lara*

🔬 *DIAGNÓSTICO CLÍNICO — $20*
✔ Evaluación médica completa
✔ Tricoscopia del cuero cabelludo
✔ Fotografías iniciales de seguimiento
✔ Plan de tratamiento personalizado
✔ Prescripción médica incluida
_Si inicias tratamiento ese mismo día, la consulta queda sin costo adicional._

💉 *MESOTERAPIA CAPILAR — $45/sesión*
✔ Diagnóstico incluido (primera vez)
✔ Microinyecciones regenerativas
✔ Vitaminas + péptidos + activos capilares
✔ Seguimiento fotográfico incluido
📦 Paquete 4 sesiones: *$160* _(ahorras $20)_

🩸 *PRP CAPILAR — $65/sesión*
✔ Diagnóstico incluido (primera vez)
✔ Plasma Rico en Plaquetas de tu propia sangre
✔ Estimulación folicular natural
📦 Paquete 3 sesiones: *$175* _(ahorras $20)_

✨ *EXOSOMAS CAPILARES — $120/sesión*
✔ Diagnóstico incluido (primera vez)
✔ Terapia regenerativa de última generación
✔ Ideal para alopecias avanzadas
📦 Paquete 2 sesiones: *$220* _(ahorras $20)_

💊 *TRATAMIENTO MÉDICO ORAL*
✔ Solo por prescripción médica
✔ Retiro en consulta o próxima visita
- Plan Esencial 30 días: *$25*
- Plan Completo 60 días: *$50*

📅 *SEGUIMIENTO MENSUAL — $15*
✔ Control de evolución
✔ Fotografías comparativas
✔ Ajuste de tratamiento

🌟 *PLAN INICIO — $160*
Diagnóstico + 4 mesoterapias + 3 seguimientos
_(valor regular $215 — ahorras $55)_

Para agendar escribe *2* 🗓️`;

const TRICO_ORAL = `💊 *Tratamiento Médico Oral*
_Solo por prescripción médica tras diagnóstico_

Contamos con dos planes según tu caso:

📦 *Plan Esencial — $25*
✔ 30 días de tratamiento
✔ Fórmula capilar de entrada
✔ Retiro en consulta

📦 *Plan Completo — $50*
✔ 60 días de tratamiento
✔ Fórmula capilar avanzada
✔ Mayor concentración de activos
✔ Retiro en consulta o próxima visita

_El tratamiento se define después de tu diagnóstico clínico.
Pedido bajo solicitud — coordinamos entrega en tu visita._

Para agendar tu diagnóstico escribe *2* 🗓️`;

const TRICO_FUE = `💎 *Trasplante FUE Capilar*
_Solo disponible en Quito_

La solución definitiva y permanente para la alopecia.

✅ *Incluye:*
✔ Evaluación previa sin costo
✔ Diseño personalizado de implantación
✔ Extracción folículo a folículo
✔ Instrumental FUE de precisión quirúrgica
✔ Seguimiento postoperatorio completo

💰 *Inversión según área:*
- Área pequeña: desde $600
- Área mediana: desde $800
- Área completa: desde $1,000

_Precio exacto se define en la evaluación gratuita previa._

Para agendar tu evaluación sin costo escribe *2* 🗓️`;

// ─── Claude Haiku (fallback punch) ────────────────────────────────────────
async function preguntarAClaude(mensaje) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json'
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `Eres el asistente de punch.capilar, tienda ecuatoriana de instrumental FUE para trasplante capilar. Responde en español, máximo 3 líneas, tono profesional médico. Productos: Portazafiro FUE $49.99, Hoja Zafiro FUE $54.99, FUE Punch Estándar $9.99, FUE Punch Elaborado $14.99, Kit Completo FUE $99.99. Envíos a todo Ecuador. Pago con tarjetas ecuatorianas vía Payphone. Si no sabes algo, di que un asesor se comunicará pronto.`,
        messages: [{ role: 'user', content: mensaje }]
      })
    });
    const data = await res.json();
    return data?.content?.[0]?.text || null;
  } catch (e) {
    console.error('Error Claude API:', e.message);
    return null;
  }
}

// ─── Keywords globales (solo fuera de paso activo) ────────────────────────
async function checkKeyword(jid, msg, s) {
  const nombre = s.datos?.nombre ? ` ${s.datos.nombre}` : '';

  if (/precio|cuánto cuesta|cuanto cuesta|cuánto vale|cuanto vale/i.test(msg)) {
    await enviar(jid,
      `Tenemos tratamientos desde $20.\nEscribe *1* para ver todos los precios del servicio que te interesa:\n1️⃣ Instrumental FUE\n2️⃣ Tricología Dr. David Lara`
    );
    return true;
  }
  if (/dirección|direccion|dónde|donde queda|ubicación|ubicacion/i.test(msg)) {
    await enviar(jid,
      `El Dr. David Lara atiende en:\n📍 *Quito* — dirección a confirmar en cita\n📍 *Riobamba* — dirección a confirmar en cita\nEl trasplante FUE solo se realiza en Quito.\nPara agendar escribe *2*.`
    );
    return true;
  }
  if (/^(horario|disponibilidad|cuándo|cuando|qué días|que dias)/.test(msg)) {
    await enviar(jid,
      `Para conocer disponibilidad agenda tu cita:\nEscribe *2* y te confirmamos horarios en las próximas horas 🗓️`
    );
    return true;
  }
  if (/^(gracias|ok|listo|perfecto|entendido|genial|de acuerdo)$/i.test(msg)) {
    await enviar(jid, `Con gusto${nombre} 😊\nSi necesitas algo más escribe *menú*.`);
    return true;
  }
  return false;
}

// ─── Manejador principal ──────────────────────────────────────────────────
async function manejarMensaje(jid, texto) {
  const msg = texto.trim().toLowerCase();

  if (!sessions[jid])
    sessions[jid] = { servicio: null, paso: null, datos: {}, visitado: false, reminderTimer: null };
  const s = sessions[jid];

  // ── 'menu' / 'inicio' → siempre al menú principal ────────────────────
  if (/^(menu|menú|inicio|start)$/.test(msg)) {
    resetSesion(jid);
    sessions[jid].visitado = true; // s es stale tras resetSesion — usar sessions[jid] directo
    return enviar(jid, MENU_PRINCIPAL);
  }

  // ══════════════════════════════════════════════════════════════════════
  // PASOS ACTIVOS — tienen prioridad sobre todo lo demás
  // ══════════════════════════════════════════════════════════════════════

  // — Punch: pedido paso a paso —
  if (s.paso === 'pedido_nombre') {
    s.datos.nombre = texto.trim();
    s.paso = 'pedido_ciudad';
    programarRecordatorio(jid);
    return enviar(jid, `Gracias, *${s.datos.nombre}*. ¿Desde qué ciudad de Ecuador nos escribe?`);
  }

  if (s.paso === 'pedido_ciudad') {
    s.datos.ciudad = texto.trim();
    s.paso = 'pedido_producto';
    programarRecordatorio(jid);
    return enviar(jid,
      `Perfecto. ¿Qué producto desea pedir?\n\n` +
      `1 - Portazafiro FUE ($49.99)\n` +
      `2 - Hoja Zafiro FUE ($54.99)\n` +
      `3 - FUE Punch Estándar ($9.99)\n` +
      `4 - FUE Punch Elaborado ($14.99)\n` +
      `5 - Kit Completo FUE ($99.99)\n\n` +
      `Escriba el número o el nombre del producto.`
    );
  }

  if (s.paso === 'pedido_producto') {
    const productos = {
      '1': 'Portazafiro FUE — $49.99',
      '2': 'Hoja Zafiro FUE — $54.99',
      '3': 'FUE Punch Estándar — $9.99',
      '4': 'FUE Punch Elaborado — $14.99',
      '5': 'Kit Completo FUE — $99.99'
    };
    s.datos.producto = productos[msg] || texto.trim();
    const orderId = 'WA-' + Date.now();
    s.paso = null;
    cancelarRecordatorio(jid);

    await enviar(jid,
      `Su pedido ha sido registrado:\n\n` +
      `*Producto:* ${s.datos.producto}\n` +
      `*Nombre:* ${s.datos.nombre}\n` +
      `*Ciudad:* ${s.datos.ciudad}, Ecuador\n` +
      `*Referencia:* ${orderId}\n\n` +
      `Un asesor confirmará los detalles de pago y envío en breve. ¡Gracias!`
    );
    await notificarAdmin(
      `Nuevo pedido por WhatsApp\n` +
      `Ref: ${orderId}\n` +
      `Producto: ${s.datos.producto}\n` +
      `Cliente: ${s.datos.nombre}\n` +
      `Ciudad: ${s.datos.ciudad}, Ecuador\n` +
      `Tel: +${jid.replace('@s.whatsapp.net', '')}`
    );
    return;
  }

  // — Tricología: agendamiento paso a paso —
  if (s.paso === 'trico_nombre') {
    s.datos.nombre = texto.trim();
    s.paso = 'trico_ciudad';
    programarRecordatorio(jid);
    return enviar(jid, `¿Nos visitas en Quito o Riobamba?`);
  }

  if (s.paso === 'trico_ciudad') {
    s.datos.ciudad = texto.trim();
    s.paso = 'trico_motivo';
    programarRecordatorio(jid);
    return enviar(jid,
      `¿Cuál es tu principal preocupación?\nPor ejemplo: caída de cabello, alopecia, entradas, trasplante u otro motivo.`
    );
  }

  if (s.paso === 'trico_motivo') {
    s.datos.motivo = texto.trim();
    s.paso = 'trico_primera';
    programarRecordatorio(jid);
    return enviar(jid, `¿Es tu primera consulta con el Dr. David Lara?`);
  }

  if (s.paso === 'trico_primera') {
    s.datos.primeraVez = texto.trim();
    s.paso = 'trico_horario';
    programarRecordatorio(jid);
    return enviar(jid,
      `¿Qué horario te viene mejor?\nIndícanos mañana o tarde y qué días prefieres de la semana.`
    );
  }

  if (s.paso === 'trico_horario') {
    s.datos.horario = texto.trim();
    s.paso = null;
    cancelarRecordatorio(jid);

    await enviar(jid,
      `Perfecto ${s.datos.nombre} ✅\n` +
      `Recibimos tu solicitud de cita con el Dr. David Lara en ${s.datos.ciudad}.\n` +
      `Te confirmaremos tu horario disponible en las próximas horas 🗓️\n` +
      `Cualquier duda adicional, escríbenos.`
    );
    await notificarAdmin(
      `📅 NUEVA CITA — TRICOLOGÍA\n` +
      `Paciente: ${s.datos.nombre}\n` +
      `Ciudad: ${s.datos.ciudad}\n` +
      `Motivo: ${s.datos.motivo}\n` +
      `Primera vez: ${s.datos.primeraVez}\n` +
      `Horario preferido: ${s.datos.horario}\n` +
      `WhatsApp: +${jid.replace('@s.whatsapp.net', '')}`
    );
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // SIN PASO ACTIVO — keywords globales
  // ══════════════════════════════════════════════════════════════════════
  if (!s.paso) {
    const handled = await checkKeyword(jid, msg, s);
    if (handled) return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // MENÚ PRINCIPAL (servicio = null)
  // ══════════════════════════════════════════════════════════════════════
  if (!s.servicio) {
    // Números del menú rutean directo aunque la sesión haya sido reseteada
    if (msg === '1') { s.servicio = 'punch'; s.visitado = true; return enviar(jid, PUNCH_MENU); }
    if (msg === '2') { s.servicio = 'trico'; s.visitado = true; return enviar(jid, TRICO_MENU); }
    // Cualquier otra cosa (primera vez, saludo, desconocido) → menú principal
    s.visitado = true;
    return enviar(jid, MENU_PRINCIPAL);
  }

  // ══════════════════════════════════════════════════════════════════════
  // FLUJO PUNCH.CAPILAR (sin cambios respecto a versión anterior)
  // ══════════════════════════════════════════════════════════════════════
  if (s.servicio === 'punch') {
    // Saludo dentro del flujo → punch menu
    if (/^(hola|hi|hello|buenas|holi)$/i.test(msg))
      return enviar(jid, PUNCH_MENU);

    if (msg === '1') return enviar(jid, PUNCH_CATALOGO);

    if (msg === '2') {
      s.paso    = 'pedido_nombre';
      s.datos   = {};
      programarRecordatorio(jid);
      return enviar(jid, `Para procesar su pedido necesito algunos datos.\n\n¿Cuál es su nombre completo?`);
    }

    if (msg === '3')
      return enviar(jid,
        `Por favor indíquenos el número de referencia de su pedido (ej: WA-1234567890).\nUn asesor confirmará el estado en breve.`
      );

    if (msg === '4') return enviar(jid, PUNCH_FAQ);

    if (msg === '5') {
      const tel = jid.replace('@s.whatsapp.net', '');
      await notificarAdmin(`Cliente solicita asesor — punch.capilar\nTel: +${tel}`);
      return enviar(jid, `Un asesor de punch.capilar se comunicará con usted en breve. ¡Gracias!`);
    }

    // Fallback → Claude Haiku
    const ia = await preguntarAClaude(texto.trim());
    if (ia) return enviar(jid, ia);
    return enviar(jid, `No entendí su consulta. Escriba *menú* para ver las opciones.`);
  }

  // ══════════════════════════════════════════════════════════════════════
  // FLUJO TRICOLOGÍA DR. DAVID LARA
  // ══════════════════════════════════════════════════════════════════════
  if (s.servicio === 'trico') {
    if (msg === '1') return enviar(jid, TRICO_PRECIOS);

    if (msg === '2') {
      s.paso  = 'trico_nombre';
      s.datos = {};
      programarRecordatorio(jid);
      return enviar(jid, `¿Cuál es tu nombre completo?`);
    }

    if (msg === '3') return enviar(jid, TRICO_ORAL);
    if (msg === '4') return enviar(jid, TRICO_FUE);

    if (msg === '5') {
      resetSesion(jid);
      sessions[jid].visitado = true; // s es stale tras resetSesion — usar sessions[jid] directo
      return enviar(jid, MENU_PRINCIPAL);
    }

    // No reconocido dentro de trico → mostrar menú trico
    return enviar(jid, TRICO_MENU);
  }
}

// ─── Conexión Baileys ─────────────────────────────────────────────────────
async function connectToWhatsApp() {
  console.log('=== BAILEYS CONECTANDO ===');
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version }          = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth:              state,
    printQRInTerminal: false,
    logger:            pino({ level: 'silent' }),
    browser:           ['Punch Capilar', 'Chrome', '120.0.0']
  });

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 Escanea este QR con WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const retry = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
        : true;
      console.log('Conexión cerrada. Reconectando:', retry);
      if (retry) { isConnected = false; setTimeout(connectToWhatsApp, 3000); }
    } else if (connection === 'open') {
      console.log('=== WHATSAPP CONECTADO ===');
      isConnected = true;
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe)  continue;
      if (!msg.message)    continue;

      const jid = msg.key.remoteJid;
      if (!jid)            continue;
      if (jid === ADMIN_JID()) continue;   // nunca responder al admin

      // Ignorar contactos guardados en la agenda del teléfono
      const contacto = sock.contacts?.[jid];
      if (contacto?.name) {
        console.log(`[IGNORADO] Contacto guardado: ${contacto.name} - ${jid.replace('@s.whatsapp.net', '')}`);
        continue;
      }

      const numero = jid.replace('@s.whatsapp.net', '');

      // Si ya hubo conversación previa → ignorar completamente
      if (isKnown(jid)) {
        console.log(`[IGNORADO] Conversación previa: ${numero}`);
        continue;
      }

      const texto =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
        msg.message.buttonsResponseMessage?.selectedButtonId ||
        '';

      if (!texto) continue;

      // JID nuevo — registrar en SQLite y responder
      addJid(jid);
      console.log(`[BOT] Chat nuevo, respondiendo: ${numero} (DB: ${countJids()} JIDs)`);

      try { await manejarMensaje(jid, texto); }
      catch (e) { console.error('Error manejarMensaje:', e.message); }
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

// ─── Export para server.js ────────────────────────────────────────────────
export async function sendWhatsAppNotification(mensaje) {
  if (!isConnected || !sock) throw new Error('WhatsApp no está conectado');
  const adminNumber = process.env.WHATSAPP_ADMIN_NUMBER;
  if (!adminNumber)  throw new Error('WHATSAPP_ADMIN_NUMBER no configurado');
  await sock.sendMessage(ADMIN_JID(), { text: mensaje });
  console.log('Notificación enviada al admin');
}

connectToWhatsApp().catch(e => console.error('Error conectando WhatsApp:', e));
