import express from 'express';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupAuth } from './setup-auth.js';

console.log('=== SERVIDOR INICIANDO ===');
config();
setupAuth();
console.log('=== SETUP AUTH COMPLETADO ===');

import { sendWhatsAppNotification } from './whatsapp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 3001;

// Payphone sandbox vs production
const PAYPHONE_BASE = process.env.PAYPHONE_SANDBOX === 'false'
  ? 'https://pay.payphonetodoesposible.com'
  : 'https://pay.payphonetodoesposible.com'; // same URL, credentials differ

app.use(express.json());

// Inject WA_NUMBER into index.html so frontend can use it without exposing .env directly
app.get('/', (_req, res) => {
  const htmlPath = join(__dirname, 'index.html');
  res.sendFile(htmlPath, err => {
    if (err) res.status(500).send('Error al cargar la página');
  });
});

app.use(express.static(__dirname));

// ─── Payphone: create transaction and return redirect URL ─────────────────
app.post('/api/payphone/init', async (req, res) => {
  const { orderId, total, productos } = req.body;

  if (!orderId || !total) {
    return res.status(400).json({ error: 'orderId y total son requeridos' });
  }

  const appId = process.env.PAYPHONE_APP_ID;
  const token = process.env.PAYPHONE_TOKEN;

  if (!appId || !token) {
    return res.status(503).json({ error: 'Payphone no configurado. Agregue credenciales en .env' });
  }

  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;

  try {
    const response = await fetch(`${PAYPHONE_BASE}/api/button/Confirm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount:              Math.round(total * 100),         // cents
        amountWithTax:       Math.round((total - total / 1.12) * 100),
        amountWithoutTax:    Math.round((total / 1.12) * 100),
        tax:                 Math.round((total - total / 1.12) * 100),
        currency:            'USD',
        storeId:             appId,
        reference:           productos || 'Instrumental FUE',
        clientTransactionId: orderId,
        responseUrl:         `${baseUrl}/api/payphone/confirm`,
        cancellationUrl:     `${baseUrl}/?statusCode=2&id=${orderId}`,
        lang:                'es'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Payphone API error:', data);
      return res.status(502).json({ error: 'Error en Payphone', details: data });
    }

    res.json({ payWithPayPhone: data.payWithPayPhone, transactionId: data.transactionId });
  } catch (err) {
    console.error('Error al llamar Payphone:', err);
    res.status(500).json({ error: 'Error de red al conectar con Payphone' });
  }
});

// ─── Payphone: confirm webhook (called by Payphone after payment) ─────────
app.post('/api/payphone/confirm', async (req, res) => {
  const { clientTransactionId, transactionStatus, id } = req.body;

  console.log('Payphone webhook recibido:', req.body);

  // Verify transaction with Payphone
  if (id && process.env.PAYPHONE_TOKEN) {
    try {
      const verify = await fetch(`${PAYPHONE_BASE}/api/button/Confirm/${id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYPHONE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, clientTransactionId })
      });

      const result = await verify.json();
      console.log('Verificación Payphone:', result);
    } catch (err) {
      console.error('Error al verificar Payphone:', err);
    }
  }

  // Redirect customer to landing with success params
  const status = transactionStatus === 'Approved' ? '3' : '4';
  res.redirect(`/?statusCode=${status}&id=${clientTransactionId || id}`);
});

// ─── WhatsApp admin notification ──────────────────────────────────────────
app.post('/api/notify', async (req, res) => {
  const { orderId, producto, nombre, ciudad, total, telefono } = req.body;

  if (!orderId || !producto || !nombre) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  const mensaje =
    `Nueva orden #${orderId}\n` +
    `Producto: ${producto}\n` +
    `Cliente: ${nombre}\n` +
    `Ciudad: ${ciudad}, Ecuador\n` +
    `Total: $${total} (IVA incluido)\n` +
    `Tel: ${telefono}`;

  try {
    await sendWhatsAppNotification(mensaje);
    res.json({ success: true });
  } catch (err) {
    console.error('Error en /api/notify:', err);
    res.status(500).json({ error: 'Error al enviar notificación', details: err.message });
  }
});

// ─── Actualizar KNOWN_JIDS en Railway via API ─────────────────────────────
app.post('/api/update-jids', async (req, res) => {
  const { jids } = req.body;
  if (!Array.isArray(jids)) return res.status(400).json({ error: 'jids debe ser array' });

  const token         = process.env.RAILWAY_API_TOKEN;
  const projectId     = process.env.RAILWAY_PROJECT_ID;
  const serviceId     = process.env.RAILWAY_SERVICE_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;

  if (!token || !projectId || !serviceId || !environmentId) {
    return res.status(503).json({ error: 'Railway API no configurada — agrega RAILWAY_API_TOKEN, RAILWAY_PROJECT_ID, RAILWAY_SERVICE_ID, RAILWAY_ENVIRONMENT_ID' });
  }

  const value = jids.join(',');

  try {
    const response = await fetch('https://backboard.railway.app/graphql/v2', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        query: `mutation variableUpsert($input: VariableUpsertInput!) { variableUpsert(input: $input) }`,
        variables: {
          input: { projectId, serviceId, environmentId, name: 'KNOWN_JIDS', value }
        }
      })
    });

    const data = await response.json();
    if (data.errors) {
      console.error('[JIDS] Railway API error:', JSON.stringify(data.errors));
      return res.status(502).json({ error: 'Error Railway API', details: data.errors });
    }

    console.log(`[JIDS] KNOWN_JIDS actualizado: ${jids.length} JIDs`);
    res.json({ success: true, count: jids.length });
  } catch (e) {
    console.error('[JIDS] Error llamando Railway API:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    port:   PORT,
    wa:     process.env.WHATSAPP_ADMIN_NUMBER ? 'configurado' : 'no configurado',
    payphone: process.env.PAYPHONE_APP_ID ? 'configurado' : 'no configurado'
  });
});

app.listen(PORT, () => {
  console.log('=== SERVIDOR LISTO EN PUERTO', process.env.PORT, '===');
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`WhatsApp admin: ${process.env.WHATSAPP_ADMIN_NUMBER || 'No configurado (.env)'}`);
  console.log(`Payphone: ${process.env.PAYPHONE_APP_ID ? 'configurado' : 'No configurado (.env)'}`);
});
