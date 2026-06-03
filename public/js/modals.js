/**
 * NetScope Pro — Módulo de Modales
 * Modal de detalle del dispositivo
 */

function openModal(ip) {
  const device = allDevices.find(d => d.ip === ip);
  if (!device) return;
  selectedDeviceIp = ip;

  document.getElementById('modalTitle').textContent = `${device.hostname || ip}`;

  const connTypeLabels = { wireless: 'WiFi (inalámbrico)', wired: 'Ethernet (cableado)', iot: 'IoT (sensor/dispositivo)', unknown: 'Desconocido' };
  const calidad = etiquetaCalidad(device.quality);
  const rows = [
    ['Dirección IP', device.ip],
    ['Dirección MAC', device.mac || '—'],
    ['Fabricante', etiquetaFabricante(device.vendor)],
    ['Tipo de conexión', connTypeLabels[device.connectionType] || 'Desconocido'],
    ['Nombre de host', device.hostname || '—'],
    ['Estado', device.status === 'online' ? 'En línea' : 'Desconectado'],
    ['Latencia', device.latency !== null ? `${device.latency?.toFixed(2)} ms` : '—'],
    ['Jitter', device.jitter !== null ? `${device.jitter} ms` : '—'],
    ['Pérdida de paquetes', device.packetLoss !== null ? `${device.packetLoss}%` : '—'],
    ['Calidad', calidad],
    ['Primera detección', device.firstSeen ? formatDate(device.firstSeen) : '—'],
    ['Última actividad', device.lastSeen ? formatDate(device.lastSeen) : '—'],
    ['Equipo local', device.isLocal ? 'Sí (este equipo)' : 'No'],
  ];

  const history = device.latencyHistory || [];
  const maxVal = Math.max(...history.map(h => h.value), 1);
  const graphBars = history.map(h => {
    const pct = Math.max(4, Math.round((h.value / maxVal) * 100));
    const col = h.value > 100 ? 'var(--red)' : h.value > 30 ? 'var(--orange)' : 'var(--cyan)';
    return `<div class="mg-bar" style="height:${pct}%;background:${col}"></div>`;
  }).join('');

  document.getElementById('modalBody').innerHTML = `
    ${rows.map(([l, v]) => `<div class="modal-row">
      <span class="modal-row-label">${l}</span>
      <span class="modal-row-val">${escapeHtml(String(v))}</span>
    </div>`).join('')}
    ${history.length ? `<div class="modal-graph">
      <div class="modal-graph-title">Historial de latencia</div>
      <div class="mini-graph">${graphBars}</div>
    </div>` : ''}
  `;

  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  selectedDeviceIp = null;
}
