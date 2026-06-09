/**
 * NetScope Pro — Módulo de Dispositivos
 * Renderizado y filtrado de dispositivos de la red
 */

function renderDevices() {
  const searchEl = document.getElementById('deviceSearch');
  const search = searchEl ? searchEl.value.toLowerCase() : '';
  let devices = allDevices;

  if (currentFilter === 'online')  devices = devices.filter(d => d.status === 'online');
  if (currentFilter === 'offline') devices = devices.filter(d => d.status === 'offline');

  if (search) {
    devices = devices.filter(d =>
      (d.ip || '').toLowerCase().includes(search) ||
      (d.hostname || '').toLowerCase().includes(search) ||
      (d.mac || '').toLowerCase().includes(search) ||
      (d.vendor || '').toLowerCase().includes(search)
    );
  }

  devices.sort((a, b) => {
    if (a.isLocal && !b.isLocal) return -1;
    if (!a.isLocal && b.isLocal) return 1;
    if (a.status === 'online' && b.status !== 'online') return -1;
    if (a.status !== 'online' && b.status === 'online') return 1;
    const numA = (a.ip || '').split('.').map(Number).reduce((acc, val) => (acc * 256) + val, 0);
    const numB = (b.ip || '').split('.').map(Number).reduce((acc, val) => (acc * 256) + val, 0);
    return numA - numB;
  });

  const tbody = document.getElementById('deviceTableBody');
  if (!tbody) return;

  if (devices.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="11">
      <div class="empty-state"><div class="empty-icon pulse-slow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px;height:28px;opacity:0.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
      <p>Sin resultados para "${search || currentFilter}"</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = devices.map(d => buildDeviceRow(d)).join('');
}

function buildDeviceRow(d) {
  const statusBadge = d.status === 'online'
    ? `<span class="status-badge online"><span class="dot"></span>En línea</span>`
    : `<span class="status-badge offline"><span class="dot"></span>Desconectado</span>`;

  const latencyStr = d.latency !== null && d.latency !== undefined
    ? `<span class="mono" style="color:${latencyColor(d.latency)}">${d.latency.toFixed(1)}ms</span>`
    : '<span style="color:var(--text-dim)">—</span>';

  const jitterStr = d.jitter !== null && d.jitter !== undefined
    ? `<span class="mono" style="font-size:11px">${d.jitter}ms</span>` : '—';

  const lossStr = d.packetLoss !== null && d.packetLoss !== undefined
    ? `<span class="mono" style="color:${d.packetLoss > 10 ? 'var(--red)' : 'var(--text-sec)'}">${d.packetLoss}%</span>` : '—';

  const qualityKey = d.quality || 'Desconocida';
  const qualityLabel = etiquetaCalidad(qualityKey);
  const qualityBadge = `<span class="quality-badge ${qualityKey}">${qualityLabel}</span>`;
  const localTag = d.isLocal ? '<span class="local-tag">LOCAL</span>' : '';
  const spark = buildSparkBars(d.latencyHistory || []);
  const mac = d.mac && d.mac !== 'N/A' ? d.mac : '—';
  const vendorRaw = etiquetaFabricante(d.vendor);
  const vendor = vendorRaw !== '—' ? vendorRaw.slice(0, 18) : '—';
  const connType = d.connectionType || 'unknown';
  const connIcons = {
    wireless: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:12px;height:12px;vertical-align:middle;margin-right:3px"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1"/></svg>WiFi',
    wired: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:12px;height:12px;vertical-align:middle;margin-right:3px"><rect x="2" y="7" width="20" height="10" rx="2"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="10" y1="12" x2="10" y2="12"/></svg>Ethernet',
    iot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:12px;height:12px;vertical-align:middle;margin-right:3px"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>IoT',
    unknown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:12px;height:12px;vertical-align:middle;margin-right:3px"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>N/D'
  };
  const connLabel = connIcons[connType] || connIcons.unknown;

  const safeIp = d.ip ? escapeHtml(d.ip) : '';
  if (!safeIp) return '';

  return `<tr onclick="openModal('${safeIp}')" class="fade-in">
    <td>${statusBadge}</td>
    <td class="ip-cell">${d.ip}</td>
    <td class="hostname-cell">${escapeHtml(d.hostname || d.ip)}${localTag}</td>
    <td class="mac-cell">${mac}</td>
    <td style="font-size:11px;color:var(--text-sec);max-width:120px;overflow:hidden;text-overflow:ellipsis">${escapeHtml(vendor)}</td>
    <td><span class="conn-type-badge ${connType}">${connLabel}</span></td>
    <td>${latencyStr}</td>
    <td>${jitterStr}</td>
    <td>${lossStr}</td>
    <td>${qualityBadge}</td>
    <td>${spark}</td>
  </tr>`;
}

function buildSparkBars(history) {
  if (!history || history.length === 0)
    return '<div class="spark-bar"><span style="height:2px;opacity:0.2"></span></div>';
  const max = Math.max(...history.map(h => h.value), 1);
  const bars = history.slice(-10).map(h => {
    const pct = Math.max(5, Math.round((h.value / max) * 100));
    const col = h.value > 100 ? 'var(--red)' : h.value > 30 ? 'var(--orange)' : 'var(--cyan)';
    return `<span style="height:${pct}%;background:${col}"></span>`;
  }).join('');
  return `<div class="spark-bar">${bars}</div>`;
}

function latencyColor(ms) {
  if (ms < 10) return 'var(--green)';
  if (ms < 30) return 'var(--cyan)';
  if (ms < 100) return 'var(--orange)';
  return 'var(--red)';
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.badge-filter').forEach(el => el.removeAttribute('data-active'));
  const map = { all: 'filterAll', online: 'filterOnline', offline: 'filterOffline' };
  document.getElementById(map[f])?.setAttribute('data-active', 'true');
  renderDevices();
}

function filterDevices() {
  renderDevices();
}
