const cart = [];

const PRODUCTS = {
  'portazafiro':   { name: 'Portazafiro FUE',       price: 49.99 },
  'hoja-zafiro':   { name: 'Hoja Zafiro FUE',        price: 54.99 },
  'punch-estandar':{ name: 'FUE Punch — Estándar',   price: 9.99  },
  'punch-premium': { name: 'FUE Punch — Premium',    price: 14.99 },
  'kit-completo':  { name: 'Kit Completo FUE',        price: 99.99 }
};

// ─── Cart UI ───────────────────────────────────────────────────────────────

function updateCart() {
  const cartItemsEl = document.getElementById('cart-items');
  const subtotalEl  = document.getElementById('subtotal');
  const ivaEl       = document.getElementById('iva');
  const totalEl     = document.getElementById('total');
  const payphoneBtn = document.getElementById('payphone-btn');
  const whatsappBtn = document.getElementById('whatsapp-btn');

  if (cart.length === 0) {
    cartItemsEl.innerHTML = '<p class="text-[#787774] text-sm">No hay productos seleccionados.</p>';
    subtotalEl.textContent = '$0.00';
    ivaEl.textContent      = '$0.00';
    totalEl.textContent    = '$0.00';
    payphoneBtn.disabled = true;
    whatsappBtn.disabled = true;
    return;
  }

  let html = '<div class="space-y-3">';
  let total = 0;

  cart.forEach((item, index) => {
    total += item.price;
    html += `
      <div class="flex justify-between items-center">
        <div>
          <div class="font-medium text-[#2F3437]">${item.name}</div>
          <div class="text-sm text-[#787774]">$${item.price.toFixed(2)} c/IVA</div>
        </div>
        <button onclick="removeFromCart(${index})"
          class="text-sm text-[#787774] hover:text-[#111111] transition-colors">
          Eliminar
        </button>
      </div>`;
  });

  html += '</div>';
  cartItemsEl.innerHTML = html;

  // Prices already include 12% IVA — extract components
  const sinIva = total / 1.12;
  const iva    = total - sinIva;

  subtotalEl.textContent = `$${sinIva.toFixed(2)}`;
  ivaEl.textContent      = `$${iva.toFixed(2)}`;
  totalEl.textContent    = `$${total.toFixed(2)}`;

  payphoneBtn.disabled = false;
  whatsappBtn.disabled = false;
}

function addToCart(productId) {
  const product = PRODUCTS[productId];
  if (!product) return;
  cart.push({ id: productId, name: product.name, price: product.price });
  updateCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCart();
}

// ─── Product buttons ───────────────────────────────────────────────────────

document.querySelectorAll('.add-to-cart').forEach(btn => {
  btn.addEventListener('click', e => {
    const card      = e.target.closest('[data-product]');
    const productId = card?.dataset.product;
    if (!productId) return;

    addToCart(productId);

    const original = e.target.textContent;
    e.target.textContent = 'Agregado';
    e.target.style.background = '#333333';
    setTimeout(() => {
      e.target.textContent = original;
      e.target.style.background = '#111111';
    }, 1500);
  });
});

// ─── Payphone sandbox ─────────────────────────────────────────────────────
// Flow: init transaction via server → redirect to Payphone → server confirms

document.getElementById('payphone-btn').addEventListener('click', async () => {
  if (cart.length === 0) return;

  const totalStr  = document.getElementById('total').textContent.replace('$', '');
  const total     = parseFloat(totalStr);
  const productos = cart.map(i => i.name).join(', ');
  const orderId   = 'ORD' + Date.now();

  const btn = document.getElementById('payphone-btn');
  btn.disabled     = true;
  btn.textContent  = 'Procesando...';

  try {
    const res = await fetch('/api/payphone/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, total, productos })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error al iniciar pago');

    // Redirect to Payphone payment page (sandbox or production)
    if (data.payWithPayPhone) {
      window.location.href = data.payWithPayPhone;
    } else {
      throw new Error('No se recibió URL de pago');
    }
  } catch (err) {
    console.error('Payphone error:', err);
    alert('No se pudo iniciar el pago: ' + err.message);
    btn.disabled    = false;
    btn.textContent = 'Pagar con tarjeta';
  }
});

// ─── WhatsApp fallback ────────────────────────────────────────────────────

document.getElementById('whatsapp-btn').addEventListener('click', () => {
  if (cart.length === 0) return;

  const lineas   = cart.map(i => `• ${i.name} — $${i.price.toFixed(2)}`).join('\n');
  const total    = document.getElementById('total').textContent;
  const mensaje  = encodeURIComponent(
    `Hola, me interesa realizar un pedido:\n\n${lineas}\n\nTotal (IVA incluido): ${total}\n\n¿Pueden ayudarme?`
  );

  // Number comes from window.WA_NUMBER injected by server, fallback to placeholder
  const number = window.WA_NUMBER || '593XXXXXXXXX';
  window.open(`https://wa.me/${number}?text=${mensaje}`, '_blank');
});

// ─── Handle return from Payphone (URL params) ─────────────────────────────

(function checkPayphoneReturn() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('statusCode');
  const txId   = params.get('id');

  if (!status) return;

  if (status === '3') {
    // 3 = approved in Payphone
    showConfirmationModal(txId);
    notifyAdmin(txId);
  } else if (status === '2') {
    alert('El pago fue cancelado. Puede intentarlo de nuevo o coordinar por WhatsApp.');
  } else {
    alert('Hubo un problema con el pago (código ' + status + '). Intente nuevamente.');
  }

  // Clean URL
  history.replaceState({}, '', window.location.pathname);
})();

function showConfirmationModal(orderId) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/40 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white border border-[#EAEAEA] rounded-lg p-8 max-w-sm w-full mx-4">
      <p class="text-xs text-[#787774] uppercase tracking-widest mb-4">Pedido confirmado</p>
      <h2 class="font-['Newsreader'] text-2xl text-[#2F3437] mb-2">Pago recibido</h2>
      <p class="text-[#787774] text-sm mb-6">
        Orden <span class="font-mono text-[#2F3437]">#${orderId}</span> procesada correctamente.
        Le enviaremos los detalles por correo.
      </p>
      <button onclick="this.closest('.fixed').remove()"
        class="w-full bg-[#111111] text-white text-sm py-3 rounded-[5px] hover:bg-[#333333] transition-colors">
        Cerrar
      </button>
    </div>`;
  document.body.appendChild(modal);
}

async function notifyAdmin(txId) {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: txId,
        producto: cart.map(i => i.name).join(', ') || 'Ver transacción',
        nombre: 'Cliente',
        ciudad: 'Ecuador',
        total: document.getElementById('total').textContent.replace('$', ''),
        telefono: '-'
      })
    });
  } catch (e) {
    console.error('Error al notificar admin:', e);
  }
}
