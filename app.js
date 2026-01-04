// Módulo principal (ES module). Requiere navegador moderno.
// - Reemplaza las credenciales de Firebase cuando uses Auth/Firestore.
// - Estructura modular simple para empezar.

import { initFirebase, authSignInWithEmail, authSignOut, authOnStateChanged, authSignInWithGoogle } from './firebase-auth.js';

// URL del manifiesto de apps (puede ser local /apps.json o una URL en Cloud Storage)
const APPS_MANIFEST = '/apps.json';

// Utilidad detección de plataforma
function detectPlatform() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
  if (/Win/i.test(ua)) return 'windows';
  if (/Mac/i.test(ua)) return 'mac';
  return 'web';
}

// Render UI
const grid = document.getElementById('grid');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const loginBtn = document.getElementById('loginBtn');
const modal = document.getElementById('modal');
const userArea = document.getElementById('userArea');
const themeToggle = document.getElementById('themeToggle');

let apps = [];
let currentUser = null;
let currentCategory = 'all';

// Init Firebase (opcional, solo si usas auth)
// Replace config in firebase-auth.js before using
initFirebase();

// Load apps manifest
async function loadApps() {
  try {
    const res = await fetch(APPS_MANIFEST, { cache: 'no-store' });
    apps = await res.json();
    renderGrid();
  } catch (e) {
    console.error('No se pudo cargar apps.json', e);
    grid.innerHTML = `<div class="card">Error cargando manifiesto de apps.</div>`;
  }
}

function renderGrid() {
  const q = (searchInput.value || '').toLowerCase();
  const platform = detectPlatform();
  const filtered = apps.filter(a => {
    const matchesQuery = !q || (a.name + ' ' + (a.description || '') + ' ' + (a.tags || []).join(' ')).toLowerCase().includes(q);
    const matchesCategory = currentCategory === 'all' || a.category === currentCategory;
    return matchesQuery && matchesCategory;
  });

  grid.innerHTML = filtered.map(appCardHtml).join('');
  // attach events
  document.querySelectorAll('.install-btn').forEach(btn => btn.addEventListener('click', onInstallClick));
  document.querySelectorAll('.open-btn').forEach(btn => btn.addEventListener('click', onOpenClick));
}

function appCardHtml(app) {
  return `
  <article class="card" data-id="${app.id}">
    <div class="top">
      <img class="icon" src="${app.icon}" alt="${escapeHtml(app.name)}" onerror="this.style.background='#1a1a1a'; this.src='/icons/default.png'">
      <div>
        <h3>${escapeHtml(app.name)}</h3>
        <div class="meta">${escapeHtml(app.category || '')} • ${humanSize(app.size_bytes)}</div>
      </div>
    </div>
    <p class="desc">${escapeHtml(app.description || '')}</p>
    <div class="actions">
      <button class="btn primary install-btn" data-id="${app.id}">Instalar</button>
      <button class="btn open-btn" data-id="${app.id}">Abrir</button>
    </div>
  </article>`;
}

function escapeHtml(str='') {
  return (''+str).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

function humanSize(bytes) {
  if (!bytes) return '';
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  const mb = kb / 1024;
  if (mb < 1024) return mb.toFixed(1) + ' MB';
  return (mb/1024).toFixed(2) + ' GB';
}

// Instalación: estrategia cross-platform
function onInstallClick(e) {
  const id = e.currentTarget.dataset.id;
  const app = apps.find(a => a.id === id);
  const platform = detectPlatform();
  if (!app) return;

  const p = app.platforms?.[platform] || app.platforms?.web;
  if (!p) return alert('No hay instalador disponible para esta plataforma.');

  // Android: abrir Play Store o APK
  if (platform === 'android') {
    if (p.playstore_url) return window.open(p.playstore_url, '_blank');
    if (p.installer_url) return window.open(p.installer_url, '_blank');
  }

  // iOS: App Store
  if (platform === 'ios') {
    if (p.app_store_url) {
      // itms-apps:// para abrir directamente en App Store (iOS)
      const url = p.app_store_url.replace(/^https?:\/\/apps.apple.com/, 'itms-apps://apps.apple.com');
      return window.open(url, '_blank');
    }
  }

  // Windows / mac / web: descargar instalador o abrir web
  if (platform === 'windows' || platform === 'mac' || platform === 'web') {
    if (p.installer_url) return window.open(p.installer_url, '_blank');
    if (p.url) return window.open(p.url, '_blank');
  }

  alert('Acción no disponible para esta plataforma.');
}

// Abrir: intentar deep link -> fallback store -> web
function onOpenClick(e) {
  const id = e.currentTarget.dataset.id;
  const app = apps.find(a => a.id === id);
  const platform = detectPlatform();
  if (!app) return;
  const p = app.platforms?.[platform] || app.platforms?.web;
  if (!p) return alert('No hay método para abrir esta app.');

  if (p.deep_link) {
    tryOpenDeepLink(p.deep_link, p);
    return;
  }
  if (p.url) return window.open(p.url, '_blank');
  if (p.playstore_url) return window.open(p.playstore_url, '_blank');
  if (p.app_store_url) return window.open(p.app_store_url, '_blank');
  alert('No se pudo abrir la app.');
}

// deep link tactic with simple fallback
function tryOpenDeepLink(link, p) {
  // Intent: set location to deep link and fallback after timeout
  const fallback = () => {
    if (p.playstore_url) window.open(p.playstore_url, '_blank');
    else if (p.app_store_url) window.open(p.app_store_url, '_blank');
    else if (p.url) window.open(p.url, '_blank');
  };
  const now = Date.now();
  // Some browsers block immediate location change to custom schemes, try safe method:
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = link;
  document.body.appendChild(iframe);
  setTimeout(() => {
    document.body.removeChild(iframe);
    // If user did not switch away, run fallback
    if (Date.now() - now < 2000) fallback();
  }, 1500);
}

// Search and UI events
searchInput.addEventListener('input', () => renderGrid());
refreshBtn.addEventListener('click', () => loadApps());

// Category nav
document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', (ev) => {
  document.querySelectorAll('.nav-btn').forEach(n => n.classList.remove('active'));
  ev.currentTarget.classList.add('active');
  currentCategory = ev.currentTarget.dataset.cat || 'all';
  renderGrid();
}));

// Theme toggle
themeToggle.addEventListener('click', () => {
  if (document.body.classList.contains('light')) {
    document.body.classList.remove('light');
    themeToggle.textContent = 'Modo oscuro';
  } else {
    document.body.classList.add('light');
    themeToggle.textContent = 'Modo claro';
  }
});

// Modal helpers (simple)
function showModal(html) {
  modal.innerHTML = `<div class="panel">${html}<div style="text-align:right;margin-top:12px"><button id="modalClose" class="small-btn">Cerrar</button></div></div>`;
  modal.classList.remove('hidden');
  document.getElementById('modalClose').addEventListener('click', ()=>modal.classList.add('hidden'));
}

// Login flow using Firebase (email/password + Google)
loginBtn.addEventListener('click', () => {
  showModal(renderLoginHtml());
  document.getElementById('loginForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
      await authSignInWithEmail(email, pass);
      modal.classList.add('hidden');
    } catch (err) {
      alert('Error al iniciar sesión: ' + (err.message || err));
    }
  });
  document.getElementById('googleSign').addEventListener('click', async () => {
    try {
      await authSignInWithGoogle();
      modal.classList.add('hidden');
    } catch (err) { alert('Error Google Sign: ' + err.message); }
  });
});

function renderLoginHtml() {
  return `
    <h2>Iniciar sesión</h2>
    <form id="loginForm">
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
        <input id="email" placeholder="Correo electrónico" required />
        <input id="password" placeholder="Contraseña" type="password" required />
        <div style="display:flex;gap:8px">
          <button class="btn primary" type="submit">Entrar</button>
          <button id="googleSign" type="button" class="btn">Entrar con Google</button>
        </div>
      </div>
    </form>
    <p style="margin-top:12px;color:var(--muted)">¿No tienes cuenta? Puedes registrarte con tu correo.</p>
  `;
}

// User state
authOnStateChanged(user => {
  currentUser = user;
  renderUserArea();
});

function renderUserArea() {
  if (!currentUser) {
    userArea.innerHTML = `<div style="font-size:13px;color:var(--muted)">No conectado</div>`;
    loginBtn.style.display = 'inline-block';
  } else {
    userArea.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center">
        <img src="${currentUser.photoURL || '/icons/default-avatar.png'}" width="36" height="36" style="border-radius:10px;object-fit:cover">
        <div style="font-size:13px">
          <div>${currentUser.displayName || currentUser.email}</div>
          <div style="color:var(--muted);font-size:12px">Ver perfil</div>
        </div>
        <button id="logoutBtn" class="small-btn">Salir</button>
      </div>
    `;
    loginBtn.style.display = 'none';
    document.getElementById('logoutBtn').addEventListener('click', async ()=> {
      await authSignOut();
    });
  }
}

// Initial load
loadApps();

// Register service worker (PWA)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js').then(()=>console.log('SW registrado')).catch(console.error);
}