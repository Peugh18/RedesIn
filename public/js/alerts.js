/**
 * NetScope Pro — Módulo de Alertas
 * Renderizado y gestión de alertas
 */

function renderAlerts() {
  const container = document.getElementById('alertsList');
  if (!container) return;

  const badge = document.getElementById('alertBadge');
  if (badge) badge.textContent = alerts.length;
  const navBadge = document.getElementById('navAlertBadge');
  if (navBadge) navBadge.textContent = alerts.length;

  if (alerts.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:20px 0">
      <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px;height:28px;color:var(--green)"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div><p>Sin alertas activas</p></div>`;
    return;
  }

  const iconSvg = {
    device_offline: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" style="width:14px;height:14px"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
    device_online: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" style="width:14px;height:14px"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 9"/></svg>',
    high_latency: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2" style="width:14px;height:14px"><polyline points="13 2 3 14h9l-1 8 10-12h-9l1-8"/></svg>',
    packet_loss: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" style="width:14px;height:14px"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>',
    jitter: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2" style="width:14px;height:14px"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    weak_signal: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2" style="width:14px;height:14px"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><circle cx="12" cy="20" r="1"/></svg>',
    channel_congestion: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2" style="width:14px;height:14px"><rect x="4" y="14" width="4" height="6"/><rect x="10" y="10" width="4" height="10"/><rect x="16" y="6" width="4" height="14"/></svg>',
    security_vuln: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" style="width:14px;height:14px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
    arp_spoofing: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" style="width:14px;height:14px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };
  const defaultIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2" style="width:14px;height:14px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

  container.innerHTML = alerts.slice(0, 25).map(a => {
    const icon = iconSvg[a.type] || defaultIcon;
    const t = new Date(a.timestamp).toLocaleTimeString('es-MX', { hour12: false });
    return `<div class="alert-item ${a.severity || 'warning'}">
      <div class="alert-icon">${icon}</div>
      <div>
        <div class="alert-text">${escapeHtml(a.message)}</div>
        <div class="alert-time">${t}</div>
      </div>
    </div>`;
  }).join('');
}

function addAlertLocal(type, message, severity = 'warning') {
  const alert = {
    id: Date.now(),
    type,
    message,
    severity,
    timestamp: new Date().toISOString()
  };
  alerts.unshift(alert);
  if (alerts.length > 50) alerts.pop();
  return alert;
}

function clearAlerts() {
  alerts = [];
  renderAlerts();
  updateMetrics();
}
