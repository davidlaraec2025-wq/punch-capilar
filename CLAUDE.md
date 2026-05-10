# Arquitectura del Proyecto: punch.capilar
**Tipo:** Landing page e-commerce premium — instrumental FUE para trasplante capilar  
**Mercado:** Ecuador — Quito, Guayaquil, Cuenca (cirujanos capilares, tricólogos, dermatólogos, clínicas FUE)  
**Stack:** HTML + Tailwind CSS (CDN) · Vanilla JS · Payphone · WhatsApp (Baileys o Business API) · Node.js backend mínimo

---

## Skills activas en este proyecto

| Skill | Rol |
|---|---|
| `minimalist-ui` | Sistema visual completo — paleta, tipografía, componentes, animaciones |
| `whatsapp-baileys` | Notificación automática al admin tras cada compra |
| `frontend-design` | Código HTML/Tailwind de producción, iteración visual |

---

## 1. Identidad Visual — regido por skill `minimalist-ui`

**Aplicar TODAS las reglas de la skill `minimalist-ui` sin excepción:**

- **Canvas:** `#FBFBFA` (warm off-white) como fondo base de secciones claras
- **Superficies de card:** `#FFFFFF` con `border: 1px solid #EAEAEA`
- **Tipografía hero (H1/H2):** `'Newsreader'` o `'Instrument Serif'` — serif editorial, tracking `-0.03em`, line-height `1.1`
- **Tipografía UI (body, botones, labels):** `'Geist Sans'` o `'Helvetica Neue'` — geométrica, limpia
- **Texto body:** `#2F3437` (off-black), nunca `#000000`
- **Texto secundario:** `#787774`
- **CTA primario:** fondo `#111111`, texto `#FFFFFF`, border-radius `4px–6px`, sin sombra
- **Hover botón:** `transform: scale(0.98)` + shift a `#333333`
- **Bordes/divisores:** `1px solid #EAEAEA` — sin excepciones
- **Animaciones entry:** `translateY(12px)` + `opacity:0` → visible en `600ms` via `IntersectionObserver`
- **Prohibido:** gradientes, sombras pesadas, colores saturados, emojis, "Inter", "Roboto", pill shapes en cards, glassmorphism
- **Iconografía:** SVG primitivos o Phosphor Icons (Bold weight) — nunca Lucide ni Feather
- **Imágenes placeholder:** `https://picsum.photos/seed/{context}/800/600` con tono desaturado cálido

---

## 2. Catálogo de Productos y Precios (USD, IVA Ecuador 12%)

### Productos individuales

| Producto | Precio sin IVA | IVA (12%) | Precio final |
|---|---|---|---|
| Portazafiro FUE | $44.63 | $5.36 | **$49.99** |
| Hoja Zafiro FUE | $49.10 | $5.89 | **$54.99** |
| FUE Punch — Estándar | $8.92 | $1.07 | **$9.99** |
| FUE Punch — Premium | $13.38 | $1.61 | **$14.99** |

> **FUE Punch Estándar ($9.99):** diseño de punta convencional, ideal para procedimientos estándar.  
> **FUE Punch Elaborado ($14.99):** geometría de punta más trabajada/anatómica — mayor precisión en extracción del folículo, para cirujanos que buscan acabado premium.

### Combo único

| Combo | Incluye | Precio regular | Precio combo | Ahorro |
|---|---|---|---|---|
| **Kit Completo FUE** | Portazafiro + Hoja Zafiro + FUE Punch Estándar | $114.97 | **$99.99** | $14.98 |

> Badge visible en la card: "Ahorras $14.98" en pastel pale yellow `#FBF3DB`.  
> Mostrar precio tachado `~~$114.97~~` + precio final `$99.99` + badge "Kit más completo".  
> El Kit incluye el Punch Estándar; quien quiera el Elaborado puede comprarlo individualmente.

---

## 3. Arquitectura de Secciones (orden fijo de conversión)

### `[01] HERO`
- Serif editorial grande (H1): claim directo al profesional médico ecuatoriano
- Subheadline en sans-serif: qué es, para quién es, qué lo diferencia
- Imagen hero del instrumental sobre fondo neutro
- CTA: `"Ver productos"` → scroll a `#catalogo`
- Trust badges inline: "Envío a todo Ecuador · Pago seguro · Soporte WhatsApp"
- Entrada con animación `translateY` via IntersectionObserver

### `[02] CATÁLOGO` — id: `#catalogo`
- Bento grid asimétrico: 4 cards de productos individuales + 1 card destacada de Kit Completo
- Cada card: imagen producto + nombre técnico + descripción 2 líneas + precio (con y sin IVA) + botón "Agregar"
- Cards de combo: badge "Más popular" o "Mejor valor" en pastel pale yellow `#FBF3DB`
- Precio tachado visible en combos + precio final + badge ahorro
- Interactividad: selección actualiza resumen de orden en `#checkout`
- `border: 1px solid #EAEAEA`, `border-radius: 8px`, padding `32px`

### `[03] BENEFICIOS`
- Grid 2×2 o 3 columnas con ícono SVG (Phosphor Bold) + título + descripción 1 línea
- Contenido: precisión de corte, ergonomía en cirugía, material médico certificado, durabilidad
- Sin fondos de color — solo texto sobre canvas claro, separado por `border-bottom: 1px solid #EAEAEA`

### `[04] GUÍA DE USO INTERACTIVA`
- Tabs horizontales: `Hoja Zafiro` / `Portazafiro` / `FUE Punch`
- Tab activo: `border-bottom: 2px solid #111111`
- Contenido por tab: cuándo usarlo + técnica + cuidado del instrumento
- Terminología médica en español estándar (no anglicismos)
- Diagrama SVG técnico inline por cada instrumento

### `[05] PRUEBA SOCIAL — Ecuador`
- 2–3 testimonios de profesionales ecuatorianos
- Formato: `"[cita corta en primera persona]"` — separador — `Dr. [Nombre] · [Especialidad] · [Ciudad, Ecuador]`
- Tipografía de cita: serif italic grande, color `#2F3437`
- Sin cajas, sin estrellas — solo texto dividido por `border-bottom: 1px solid #EAEAEA`
- Badge contextual: *"Instrumental utilizado en clínicas de Quito y Guayaquil"*

### `[06] CHECKOUT` — id: `#checkout`
- Resumen de orden dinámico (actualiza según selección del catálogo)
- Desglose: subtotal + IVA 12% + total
- CTA Payphone: botón `"Pagar con tarjeta"` — integración vía SDK o link de pago Payphone
- Botón secundario: `"Coordinar por WhatsApp"` → abre `https://wa.me/593XXXXXXXXX?text=Hola,...`
- Texto confianza: "Pago seguro · Tarjetas ecuatorianas · Factura electrónica disponible"

### `[07] ENVÍO`
- Couriers: Servientrega, Laar Courier, Speed
- Tiempo estimado por zona: Quito/Guayaquil 24–48h, provincias 2–4 días hábiles
- Costo de envío: [a definir por cliente]
- Política de devolución breve (1 párrafo)

### `[08] FAQ`
- Acordeón sin caja contenedora — solo `border-bottom: 1px solid #EAEAEA` entre items
- Toggle: ícono `+` / `−` SVG, sin Lucide
- Preguntas específicas Ecuador:
  - ¿Realizan envíos a provincias?
  - ¿Puedo pagar con tarjeta del Banco Pichincha, Produbanco o Diners?
  - ¿Emiten factura electrónica con RUC?
  - ¿Los instrumentos tienen garantía?
  - ¿Cómo elijo el tamaño correcto de FUE Punch?
  - ¿Cuánto tarda el envío a mi ciudad?

### `[09] FOOTER`
- Logo + tagline en español
- RUC del negocio (credibilidad con médicos)
- Número WhatsApp +593...
- Links: Política de privacidad · Términos y condiciones · Contacto

---

## 4. Flujo Post-Compra (skill `whatsapp-baileys`)

```
Pago completado via Payphone callback/webhook
  → Modal de confirmación: "¡Pedido recibido! #{orden}"
  → POST /api/notify → servidor Node.js
      → Baileys sock.sendMessage(adminJid, {
          text: `🛒 Nueva orden #${id}
Producto: ${producto} ${variante}
Cliente: ${nombre}
Ciudad: ${ciudad}, Ecuador
Total: $${total} (IVA incluido)
Tel: ${telefono}`
        })
```

Estructura backend mínima:
```
/
├── index.html          ← landing completa
├── server.js           ← Express: /api/notify endpoint
├── whatsapp.js         ← Baileys singleton (per skill whatsapp-baileys)
├── js/
│   ├── checkout.js     ← lógica Payphone + resumen orden
│   └── ui.js           ← tabs, acordeón, IntersectionObserver
├── auth_info_baileys/  ← sesión WhatsApp (en .gitignore)
└── .env
```

---

## 5. Variables de Entorno (.env) — NUNCA hardcodear

```
PAYPHONE_APP_ID=
PAYPHONE_TOKEN=
WHATSAPP_ADMIN_NUMBER=593XXXXXXXXX
PORT=3001
```

---

## 6. Reglas Absolutas de Código

- **Mobile-first** desde 375px. La mayoría de médicos ecuatorianos usan móvil
- **Un solo `index.html`** con Tailwind CDN — todo inline salvo `js/` separado
- **Vanilla JS únicamente** — sin React, sin Vue, sin jQuery
- **Copy 100% español ecuatoriano** — sin anglicismos, sin clichés de IA
- **Precios siempre en USD** con IVA desglosado visible
- **Scroll entry** en todos los bloques principales via `IntersectionObserver`
- **Imágenes:** `loading="lazy"`, máx 2 fuentes Google Fonts externas
- **Sin secciones extra** no definidas en este CLAUDE.md

---

## 7. Checklist de Entrega

- [ ] Hero completo visible en 375px sin scroll
- [ ] Catálogo con 4 productos + 1 combo funcionando
- [ ] Precios con IVA desglosado en cada card y en checkout
- [ ] Combo card con precio tachado + badge de ahorro
- [ ] Tabs de guía de uso funcionales (Vanilla JS)
- [ ] FAQ acordeón sin librería externa
- [ ] Testimonios con ciudad ecuatoriana real
- [ ] Payphone botón conectado (sandbox primero)
- [ ] Notificación WhatsApp Baileys disparando en +593
- [ ] `.env` y `auth_info_baileys/` en `.gitignore`
- [ ] Cero emojis en el UI — solo SVG/Phosphor Icons
- [ ] Cero sombras pesadas — solo `1px solid #EAEAEA`
- [ ] Animaciones entry via IntersectionObserver activas
