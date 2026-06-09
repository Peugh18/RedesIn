/**
 * NetScope Pro — Módulo de Topología
 * Visualización de topología de red + análisis ARP
 */

async function loadTopology() {
  try {
    const res = await fetch('/api/topology');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderTopologyMap(data);
  } catch (e) {
    console.error('Error cargando topología:', e.message);
    const container = document.getElementById('topologyCanvas');
    if (container) {
      container.innerHTML = '<div class="empty-state"><p>Error al cargar topología</p></div>';
    }
  }

  // Also load ARP analysis
  try {
    const res = await fetch('/api/arp/analysis');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderArpAnalysis(data);
  } catch (e) {
    console.warn('Error cargando análisis ARP:', e.message);
  }
}

function renderTopologyMap(data) {
  const container = document.getElementById('topologyCanvas');
  if (!container) return;

  const { nodes, links, gateway } = data;
  if (!nodes || nodes.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>Sin dispositivos detectados</p></div>';
    return;
  }

  // Calcular posiciones en un diseño de estrella
  const width = container.clientWidth || 700;
  const height = Math.max(400, nodes.length * 30);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;

  // Puerta de enlace en el centro
  const gatewayNode = nodes.find(n => n.type === 'gateway');
  const otherNodes = nodes.filter(n => n.type !== 'gateway');

  let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:${height}px">`;

  // Dibujar enlaces primero (detrás de los nodos)
  otherNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / otherNodes.length - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    node._x = x;
    node._y = y;

    const link = links.find(l => l.target === node.id);
    const strokeColor = link && link.quality
      ? (link.quality === 'critical' ? 'var(--red)' : link.quality === 'warning' ? 'var(--orange)' : 'var(--green)')
      : 'var(--border)';
    const dashArray = node.status === 'offline' ? '4,4' : 'none';

    svg += `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="${strokeColor}" stroke-width="1.5" stroke-dasharray="${dashArray}" opacity="0.7"/>`;

    // Latency label on link
    if (link && link.latency !== null && link.latency !== undefined) {
      const midX = (centerX + x) / 2;
      const midY = (centerY + y) / 2;
      svg += `<text x="${midX}" y="${midY - 6}" text-anchor="middle" fill="var(--text-dim)" font-size="9" font-family="JetBrains Mono">${link.latency.toFixed(0)}ms</text>`;
    }
  });

  // Draw gateway node
  svg += `<circle cx="${centerX}" cy="${centerY}" r="22" fill="var(--cyan-dim)" stroke="var(--cyan)" stroke-width="2"/>`;
  svg += `<text x="${centerX}" y="${centerY + 4}" text-anchor="middle" fill="var(--cyan)" font-size="10" font-weight="700" font-family="Inter">GW</text>`;
  svg += `<text x="${centerX}" y="${centerY + 36}" text-anchor="middle" fill="var(--text-sec)" font-size="9" font-family="JetBrains Mono">${gateway}</text>`;

  // Draw other nodes
  otherNodes.forEach((node) => {
    const x = node._x;
    const y = node._y;
    const isLocal = node.type === 'local';
    const isOnline = node.status === 'online';

    const fillColor = isLocal ? 'var(--blue-dim)' : isOnline ? 'var(--green-dim)' : 'var(--red-dim)';
    const strokeCol = isLocal ? 'var(--blue)' : isOnline ? 'var(--green)' : 'var(--red)';
    const r = isLocal ? 16 : 12;

    svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${fillColor}" stroke="${strokeCol}" stroke-width="1.5"/>`;

    // Node label
    const label = (node.label || node.id).substring(0, 14);
    svg += `<text x="${x}" y="${y + r + 14}" text-anchor="middle" fill="var(--text-sec)" font-size="9" font-family="Inter">${escapeHtml(label)}</text>`;

    // Type icon indicator
    if (isLocal) {
      svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" fill="var(--blue)" font-size="8" font-weight="700">TU</text>`;
    }
  });

  svg += '</svg>';
  container.innerHTML = svg;
}

function renderArpAnalysis(data) {
  const container = document.getElementById('arpAnalysis');
  if (!container) return;

  let html = '';

  // Anomalies section
  if (data.anomalies && data.anomalies.length > 0) {
    html += '<div class="arp-anomalies">';
    html += data.anomalies.map(a => {
      const icon = a.severity === 'critical'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" style="width:14px;height:14px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2" style="width:14px;height:14px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      return `<div class="arp-anomaly-item ${a.severity}">
        <div class="arp-icon">${icon}</div>
        <div class="arp-desc">${escapeHtml(a.description)}</div>
      </div>`;
    }).join('');
    html += '</div>';
  } else {
    html += `<div class="arp-status-ok">
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" style="width:16px;height:16px"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <span>Sin anomalias ARP detectadas — Red segura</span>
    </div>`;
  }

  // ARP table
  if (data.devices && data.devices.length > 0) {
    html += '<div class="arp-table-wrap"><table class="arp-table"><thead><tr><th>IP</th><th>MAC</th><th>Hostname</th><th>Fabricante</th></tr></thead><tbody>';
    html += data.devices.map(d => `<tr>
      <td class="mono">${d.ip}</td>
      <td class="mono">${d.mac || '--'}</td>
      <td>${escapeHtml(d.hostname || '--')}</td>
      <td style="font-size:11px;color:var(--text-sec)">${escapeHtml((d.vendor || '--').substring(0, 20))}</td>
    </tr>`).join('');
    html += '</tbody></table></div>';
  }

  container.innerHTML = html;
}
