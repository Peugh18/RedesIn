/**
 * NetScope Pro — Módulo de Seguridad
 * Detección de vulnerabilidades WiFi y renderizado
 */

function renderSecurityPanel() {
  const container = document.getElementById('securityList');
  if (!container) return;

  const vulnerable = allWifi.filter(n =>
    n.securityRisk && (n.securityRisk.level === 'critical' || n.securityRisk.level === 'high' || n.securityRisk.level === 'medium')
  );

  if (vulnerable.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:20px 0">
      <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px;height:28px;color:var(--green)"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg></div><p>No se detectaron vulnerabilidades</p></div>`;
    return;
  }

  const secIcons = {
    critical: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" style="width:16px;height:16px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    high: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2" style="width:16px;height:16px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    medium: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2" style="width:16px;height:16px"><polyline points="13 2 3 14h9l-1 8 10-12h-9l1-8"/></svg>'
  };

  container.innerHTML = vulnerable.map(n => {
    const risk = n.securityRisk;
    const icon = secIcons[risk.level] || secIcons.high;
    const levelClass = risk.level;
    return `<div class="security-item ${levelClass}">
      <div class="sec-icon">${icon}</div>
      <div class="sec-info">
        <div class="sec-ssid">${escapeHtml(n.ssid)}</div>
        <div class="sec-desc">${escapeHtml(risk.description)}</div>
      </div>
      <div class="sec-level-badge ${levelClass}">${escapeHtml(risk.label)}</div>
    </div>`;
  }).join('');
}
