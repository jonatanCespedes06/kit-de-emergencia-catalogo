// === Medición ===
// 1. Creá tu propiedad GA4 y pegá el ID acá, ej: 'G-ABC123XYZ'
// 2. Cloudflare Web Analytics se agrega en index.html con el token del dashboard.
const GA4_ID = 'G-TMLQCCZHNC';

function initAnalytics() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  if (!GA4_ID) return;
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID);
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
  document.head.appendChild(s);
}

function trackEvent(name, params) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: name }, params || {}));
    if (window.gtag && GA4_ID) window.gtag('event', name, params || {});
  } catch (e) { /* noop */ }
}

function wireTracking() {
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-track]');
    if (!el) return;
    const kind = el.getAttribute('data-track');
    const place = el.getAttribute('data-place') || 'unknown';
    const product = el.getAttribute('data-product') || undefined;
    const category = el.getAttribute('data-category') || undefined;
    const price = el.getAttribute('data-price') || undefined;
    trackEvent(kind, { place, product, category, price, outlink: el.href || undefined });
  });
}

async function init() {
  initAnalytics();
  wireTracking();
  const catalogoEl = document.getElementById('catalogo');
  const navScrollEl = document.getElementById('catNavScroll');

  const fmtARS = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  });

  let data;
  try {
    const res = await fetch('products.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo cargar products.json');
    data = await res.json();
  } catch (err) {
    catalogoEl.innerHTML = '<p class="error">No pudimos cargar el menú ahora mismo. Escribinos por WhatsApp y te lo pasamos.</p>';
    wireGeneralLinks({ whatsapp: '5491148701239', mensajeWhatsapp: 'Hola! ¿Me pasás el menú?' });
    return;
  }

  const waNumber = data.whatsapp || '5491148701239';
  wireGeneralLinks(data, waNumber);

  const categorias = [...(data.categorias || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));

  // Nav por categorías
  navScrollEl.innerHTML = '';
  categorias.forEach((cat, i) => {
    const a = document.createElement('a');
    a.className = 'chip' + (i === 0 ? ' active' : '');
    a.href = '#cat-' + cat.id;
    a.textContent = cat.nombre;
    navScrollEl.appendChild(a);
  });

  // Secciones + cards
  catalogoEl.innerHTML = '';
  categorias.forEach((cat) => {
    const section = document.createElement('section');
    section.className = 'cat-section';
    section.id = 'cat-' + cat.id;

    const h2 = document.createElement('h2');
    h2.className = 'cat-title';
    h2.textContent = cat.nombre;
    section.appendChild(h2);

    if (cat.descripcion) {
      const p = document.createElement('p');
      p.className = 'cat-desc';
      p.textContent = cat.descripcion;
      section.appendChild(p);
    }

    const grid = document.createElement('div');
    grid.className = 'grid';

    (cat.productos || []).forEach((prod) => {
      grid.appendChild(buildCard(prod, cat, waNumber, fmtARS));
    });

    section.appendChild(grid);
    catalogoEl.appendChild(section);
  });

  // Scroll-spy simple para chips activos
  const chips = [...navScrollEl.querySelectorAll('.chip')];
  const sections = [...catalogoEl.querySelectorAll('.cat-section')];
  if ('IntersectionObserver' in window && sections.length) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          chips.forEach((c) => c.classList.toggle('active', c.getAttribute('href') === '#' + e.target.id));
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach((s) => obs.observe(s));
  }

  function buildCard(prod, cat, waNumber, fmtARS) {
    const esPorPedido = Boolean(prod.porPedido ?? prod.soloPorPedido);
    const article = document.createElement('article');
    article.className = 'card' + (esPorPedido ? ' card-special' : '');

    // Imágenes: carrusel si hay varias, foto única si hay una, nada si no hay.
    // Compat legacy: prod.imagen (string) como fallback defensivo.
    const imgs = Array.isArray(prod.imagenes) && prod.imagenes.length
      ? prod.imagenes.filter((x) => typeof x === 'string' && x)
      : (typeof prod.imagen === 'string' && prod.imagen ? [prod.imagen] : []);
    if (imgs.length === 1) {
      article.appendChild(fotoUnica(imgs[0], prod.nombre, () => openLightbox(imgs, prod.nombre, 0)));
    } else if (imgs.length > 1) {
      article.appendChild(buildCarousel(imgs, prod.nombre));
    }

    const body = document.createElement('div');
    body.className = 'card-body';

    const row = document.createElement('div');
    row.className = 'card-row';

    const price = document.createElement('span');
    price.className = 'price';
    price.textContent = fmtARS.format(prod.precio);
    row.appendChild(price);

    const badgeText = prod.etiqueta || (prod.destacado ? 'Más pedido' : null);
    if (badgeText) {
      const b = document.createElement('span');
      b.className = 'badge' + (prod.destacado ? ' hot' : '');
      b.textContent = badgeText;
      row.appendChild(b);
    }
    body.appendChild(row);

    const name = document.createElement('h3');
    name.className = 'card-name';
    name.textContent = prod.nombre;
    body.appendChild(name);

    if (prod.descripcion) {
      const d = document.createElement('p');
      d.className = 'card-desc';
      d.textContent = prod.descripcion;
      body.appendChild(d);
    }

    if (Array.isArray(prod.sabores) && prod.sabores.length) {
      const pills = document.createElement('div');
      pills.className = 'pills';
      prod.sabores.forEach((sabor) => {
        const s = document.createElement('span');
        s.className = 'pill';
        s.textContent = sabor;
        pills.appendChild(s);
      });
      body.appendChild(pills);
    }

    const nota = typeof prod.notaPedido === 'string' && prod.notaPedido.trim()
      ? prod.notaPedido.trim()
      : (esPorPedido && prod.anticipacion ? `Encargalo ${prod.anticipacion} por WhatsApp.` : null);
    if (nota) {
      const note = document.createElement('p');
      note.className = 'card-note';
      note.textContent = (esPorPedido ? '🗓️ ' : 'ℹ️ ') + nota;
      body.appendChild(note);
    }

    if (prod.disponible === false) {
      const note = document.createElement('p');
      note.className = 'card-note';
      note.textContent = 'Sin stock por ahora. Consultanos por WhatsApp.';
      body.appendChild(note);
    }

    const btn = document.createElement('a');
    btn.className = 'btn ' + (esPorPedido ? 'btn-outline' : 'btn-primary');
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.setAttribute('data-track', 'wa_click');
    btn.setAttribute('data-place', 'producto');
    btn.setAttribute('data-product', prod.nombre);
    btn.setAttribute('data-category', cat.nombre);
    btn.setAttribute('data-price', String(prod.precio));
    const textoBoton = prod.textoBoton || (esPorPedido ? (prod.diaEntrega ? `Encargar para el ${prod.diaEntrega}` : 'Encargar') : 'Pedir por WhatsApp');
    const msg = esPorPedido
      ? `Hola KIT DE EMERGENCIA! Quiero encargar ${prod.nombre} (${fmtARS.format(prod.precio)})${prod.diaEntrega ? ` para el ${prod.diaEntrega}` : ''}${prod.anticipacion ? ` (${prod.anticipacion})` : ''}. ¿Me anotás el pedido?`
      : `Hola KIT DE EMERGENCIA! Me interesa: ${prod.nombre} (${fmtARS.format(prod.precio)}). ¿Tienen stock?`;
    btn.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
    btn.textContent = textoBoton;
    body.appendChild(btn);

    article.appendChild(body);
    return article;
  }

  function initials(name) {
    return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  function fallbackFoto(nombre) {
    const fb = document.createElement('div');
    fb.className = 'card-img-fallback';
    fb.textContent = initials(nombre);
    return fb;
  }

  function fotoUnica(src, nombre, onClick) {
    const img = document.createElement('img');
    img.className = 'card-img card-img-click';
    img.loading = 'lazy';
    img.alt = nombre;
    img.src = src;
    img.onerror = () => img.replaceWith(fallbackFoto(nombre));
    if (onClick) img.addEventListener('click', onClick);
    return img;
  }

  function buildCarousel(imgs, nombre) {
    let idx = 0;
    const box = document.createElement('div');
    box.className = 'carrousel';

    const view = document.createElement('div');
    view.className = 'car-view';
    const img = document.createElement('img');
    img.className = 'card-img card-img-click';
    img.loading = 'lazy';
    img.addEventListener('click', () => openLightbox(imgs, nombre, idx));
    img.onerror = () => box.replaceWith(fallbackFoto(nombre));
    view.appendChild(img);
    box.appendChild(view);

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'car-btn car-prev';
    prev.textContent = '‹';
    prev.setAttribute('aria-label', 'Foto anterior de ' + nombre);
    prev.addEventListener('click', (ev) => { ev.stopPropagation(); ir(idx - 1); });

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'car-btn car-next';
    next.textContent = '›';
    next.setAttribute('aria-label', 'Foto siguiente de ' + nombre);
    next.addEventListener('click', (ev) => { ev.stopPropagation(); ir(idx + 1); });

    box.appendChild(prev);
    box.appendChild(next);

    const dots = document.createElement('div');
    dots.className = 'car-dots';
    const dotBtns = imgs.map((_, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.className = 'car-dot';
      d.setAttribute('aria-label', 'Ver foto ' + (i + 1) + ' de ' + nombre);
      d.addEventListener('click', (ev) => { ev.stopPropagation(); ir(i); });
      dots.appendChild(d);
      return d;
    });

    const count = document.createElement('span');
    count.className = 'car-count';

    const foot = document.createElement('div');
    foot.className = 'car-foot';
    foot.appendChild(dots);
    foot.appendChild(count);
    box.appendChild(foot);

    function ir(i) {
      idx = (i + imgs.length) % imgs.length;
      img.src = imgs[idx];
      img.alt = nombre + ' (' + (idx + 1) + '/' + imgs.length + ')';
      dotBtns.forEach((d, j) => d.classList.toggle('on', j === idx));
      count.textContent = (idx + 1) + '/' + imgs.length;
    }
    ir(0);
    return box;
  }

  function openLightbox(imgs, nombre, startIdx) {
    let idx = startIdx || 0;
    const overlay = document.createElement('div');
    overlay.className = 'lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Vista ampliada de ' + nombre);

    const img = document.createElement('img');
    img.className = 'lb-img';

    const count = document.createElement('span');
    count.className = 'lb-count';

    function mostrar(i) {
      idx = (i + imgs.length) % imgs.length;
      img.src = imgs[idx];
      img.alt = nombre + ' (' + (idx + 1) + '/' + imgs.length + ')';
      count.textContent = (idx + 1) + '/' + imgs.length;
    }

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'lb-btn lb-prev';
    prev.textContent = '‹';
    prev.setAttribute('aria-label', 'Foto anterior');
    prev.addEventListener('click', (ev) => { ev.stopPropagation(); mostrar(idx - 1); });

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'lb-btn lb-next';
    next.textContent = '›';
    next.setAttribute('aria-label', 'Foto siguiente');
    next.addEventListener('click', (ev) => { ev.stopPropagation(); mostrar(idx + 1); });

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'lb-btn lb-close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Cerrar vista ampliada');
    close.addEventListener('click', () => cerrar());

    overlay.appendChild(img);
    overlay.appendChild(count);
    if (imgs.length > 1) {
      overlay.appendChild(prev);
      overlay.appendChild(next);
    }
    overlay.appendChild(close);
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) cerrar(); });

    function onKey(ev) {
      if (ev.key === 'Escape') cerrar();
      else if (ev.key === 'ArrowLeft' && imgs.length > 1) mostrar(idx - 1);
      else if (ev.key === 'ArrowRight' && imgs.length > 1) mostrar(idx + 1);
    }
    function cerrar() {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
    }
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    mostrar(idx);
    close.focus();
  }

  function wireGeneralLinks(d, waNumber) {
    const num = d.whatsapp || waNumber;
    const general = `https://wa.me/${num}?text=${encodeURIComponent(d.mensajeWhatsapp || 'Hola! Quiero armar mi kit.')}`;
    ['topWhatsapp', 'heroWhatsapp', 'footerWhatsapp', 'floatWhatsapp'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = general;
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
