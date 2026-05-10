import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { config } from 'dotenv';

config();

let sock = null;
let isConnected = false;

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['Punch Capilar', 'Chrome', '120.0.0']
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Escanea este QR con WhatsApp:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
          : true;

      console.log('❌ Conexión cerrada. Reconectando:', shouldReconnect);

      if (shouldReconnect) {
        isConnected = false;
        setTimeout(connectToWhatsApp, 3000);
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp conectado');
      isConnected = true;
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

export async function sendWhatsAppNotification(mensaje) {
  if (!isConnected || !sock) {
    throw new Error('WhatsApp no está conectado');
  }

  const adminNumber = process.env.WHATSAPP_ADMIN_NUMBER;
  if (!adminNumber) {
    throw new Error('WHATSAPP_ADMIN_NUMBER no configurado en .env');
  }

  const jid = adminNumber.includes('@')
    ? adminNumber
    : `${adminNumber}@s.whatsapp.net`;

  await sock.sendMessage(jid, { text: mensaje });
  console.log('✅ Mensaje WhatsApp enviado a:', adminNumber);
}

connectToWhatsApp().catch(err => {
  console.error('❌ Error al conectar WhatsApp:', err);
});
