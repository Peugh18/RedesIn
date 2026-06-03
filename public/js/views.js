/**
 * NetScope Pro — View Navigation
 * Handles dynamic view loading, switching, and sidebar
 */

const viewCache = {};
const VIEW_NAMES = ['dashboard', 'devices', 'wifi', 'security', 'topology', 'traceroute', 'alerts'];

async function loadView(viewName) {
  if (viewCache[viewName]) return viewCache[viewName];
  try {
    const res = await fetch(`/views/${viewName}.html`);
    if (!res.ok) throw new Error(`View not found: ${viewName}`);
    const html = await res.text();
    viewCache[viewName] = html;
    return html;
  } catch (e) {
    console.error(`Error loading view ${viewName}:`, e);
    return `<div class="empty-state"><p>Error cargando vista</p></div>`;
  }
}

async function loadAllViews() {
  for (const name of VIEW_NAMES) {
    const html = await loadView(name);
    const container = document.getElementById(`view-${name}`);
    if (container) container.innerHTML = html;
  }
}

function switchView(viewName) {
  currentView = viewName;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (navItem) navItem.classList.add('active');

  if (window.innerWidth < 900) {
    document.getElementById('sidebar').classList.remove('open');
  }

  // Re-render view-specific content after switch
  if (viewName === 'devices') renderDevices();
  if (viewName === 'wifi') { renderWifi(); renderChannelMap(); }
  if (viewName === 'security') renderSecurityPanel();
  if (viewName === 'topology') loadTopology();
  if (viewName === 'alerts') renderAlerts();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function initClock() {
  const update = () => {
    const el = document.getElementById('liveClock');
    if (el) el.textContent = new Date().toLocaleTimeString('es-MX', { hour12: false });
  };
  update();
  setInterval(update, 1000);
}
