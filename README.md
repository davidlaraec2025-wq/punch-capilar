# Punch Capilar Ecuador

Landing e-commerce premium para instrumental FUE de trasplante capilar — mercado ecuatoriano.

## Stack

- **Frontend:** HTML + Tailwind CSS (CDN) + Vanilla JS
- **Backend:** Node.js + Express (puerto 3001)
- **WhatsApp:** Baileys
- **Pago:** Payphone (integración pendiente)

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno en .env
# PAYPHONE_APP_ID=tu_app_id
# PAYPHONE_TOKEN=tu_token
# WHATSAPP_ADMIN_NUMBER=593XXXXXXXXX
# PORT=3001

# 3. Iniciar servidor
npm start
```

## Primera ejecución

1. Al iniciar el servidor, aparecerá un QR en la consola
2. Escanear con WhatsApp (sección "Dispositivos vinculados")
3. La sesión se guarda en `auth_info_baileys/` (no subir a git)
4. Abrir http://localhost:3001 en el navegador

## Estructura

```
/
├── index.html          ← Landing completa (9 secciones)
├── server.js           ← Express en puerto 3001
├── whatsapp.js         ← Baileys singleton
├── js/
│   ├── checkout.js     ← Carrito + Payphone
│   └── ui.js           ← Tabs, FAQ, animaciones
├── .env                ← Variables (git-ignored)
└── auth_info_baileys/  ← Sesión WA (git-ignored)
```

## Productos y Precios

- **Portazafiro FUE:** $49.99
- **Hoja Zafiro FUE:** $54.99
- **FUE Punch Estándar:** $9.99
- **FUE Punch Premium:** $14.99
- **Kit Completo FUE:** $99.99 (ahorro $14.98)

Todos los precios incluyen IVA 12% Ecuador.

## Checklist Pre-Deploy

- [ ] Configurar credenciales Payphone en `.env`
- [ ] Actualizar número WhatsApp en `.env` y en `index.html`
- [ ] Actualizar RUC en footer
- [ ] Vincular WhatsApp escaneando QR
- [ ] Probar flujo completo: agregar → checkout → notificación WA
- [ ] Reemplazar placeholders de imágenes con fotos reales de productos

## Notas de Desarrollo

- **Puerto 3001** para no chocar con otros proyectos Node.js en este entorno
- **Mobile-first** desde 375px
- **Sin emojis** en UI — solo SVG Phosphor Icons
- **Sin librerías externas** de JS (solo Vanilla)
- Seguir reglas de `minimalist-ui` del CLAUDE.md

## Documentación Completa

Ver [CLAUDE.md](./CLAUDE.md) para arquitectura, skills activas, reglas de código y checklist de entrega.
