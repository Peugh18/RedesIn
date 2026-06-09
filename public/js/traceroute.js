/**
 * NetScope Pro — Módulo de Traceroute y Rendimiento
 */

function setTraceTarget(target) {
  const el = document.getElementById('tracerouteTarget');
  if (el) el.value = target;
}

async function runTracerouteUI() {
  const el = document.getElementById('tracerouteTarget');
  const target = el ? el.value.trim() : '';
  if (!target) return;

  const resultContainer = document.getElementById('tracerouteResult');
  const labelEl = document.getElementById('traceTargetLabel');
  if (labelEl) labelEl.textContent = target;

  resultContainer.innerHTML = `<div class="trace-loading">
    <div class="spin-icon"></div>
    <span>Ejecutando traceroute hacia ${escapeHtml(target)}... (puede tomar hasta 30s)</span>
  </div>`;

  try {
    const res = await fetch(`/api/traceroute/${encodeURIComponent(target)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderTracerouteResult(data);
  } catch (e) {
    console.error('Traceroute error:', e.message);
    resultContainer.innerHTML = '<div class="empty-state"><p>Error al ejecutar traceroute. Verifica que el destino sea válido.</p></div>';
  }
}

function renderTracerouteResult(data) {
  const container = document.getElementById('tracerouteResult');
  if (!container) return;

  if (!data.hops || data.hops.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No se obtuvieron saltos — destino no alcanzable o timeout</p></div>';
    return;
  }

  // Cadena de saltos visual
  let html = '<div class="trace-hops">';

  // Encontrar el tiempo máximo para el tamaño relativo de la barra
  const maxTime = Math.max(...data.hops.map(h => h.time || 0), 1);

  html += data.hops.map((hop, i) => {
    const isTimeout = hop.ip === '*' || hop.time === null;
    const barPct = isTimeout ? 5 : Math.max(5, Math.round((hop.time / maxTime) * 100));
    const barColor = isTimeout ? 'var(--text-dim)' : hop.time > 100 ? 'var(--red)' : hop.time > 30 ? 'var(--orange)' : 'var(--green)';
    const timeStr = isTimeout ? 'Timeout' : `${hop.time} ms`;

    return `<div class="trace-hop fade-in">
      <div class="hop-num">${hop.hop}</div>
      <div class="hop-bar-wrap">
        <div class="hop-bar" style="width:${barPct}%;background:${barColor}"></div>
      </div>
      <div class="hop-ip mono">${hop.ip}</div>
      <div class="hop-time" style="color:${barColor}">${timeStr}</div>
    </div>`;
  }).join('');

  html += '</div>';

  // Summary
  const validHops = data.hops.filter(h => h.time !== null);
  const totalHops = data.hops.length;
  const avgTime = validHops.length > 0
    ? (validHops.reduce((a, b) => a + b.time, 0) / validHops.length).toFixed(1)
    : '--';
  const maxHopTime = validHops.length > 0 ? Math.max(...validHops.map(h => h.time)).toFixed(1) : '--';

  html += `<div class="trace-summary">
    <div class="trace-stat"><span class="trace-stat-label">Saltos</span><span class="trace-stat-val">${totalHops}</span></div>
    <div class="trace-stat"><span class="trace-stat-label">Latencia promedio</span><span class="trace-stat-val">${avgTime} ms</span></div>
    <div class="trace-stat"><span class="trace-stat-label">Peor salto</span><span class="trace-stat-val">${maxHopTime} ms</span></div>
    <div class="trace-stat"><span class="trace-stat-label">Timeouts</span><span class="trace-stat-val">${totalHops - validHops.length}</span></div>
  </div>`;

  container.innerHTML = html;
}

async function measureThroughputUI() {
  const dlEl = document.getElementById('tpDownload');
  const ulEl = document.getElementById('tpUpload');
  const latEl = document.getElementById('tpLatency');
  const tgtEl = document.getElementById('tpTarget');

  if (dlEl) dlEl.textContent = '...';
  if (ulEl) ulEl.textContent = '...';

  try {
    const res = await fetch('/api/throughput');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (dlEl) dlEl.textContent = data.download ?? '--';
    if (ulEl) ulEl.textContent = data.upload ?? '--';
    if (latEl) latEl.textContent = data.latency ?? '--';
    if (tgtEl) tgtEl.textContent = data.target ?? '--';
  } catch (e) {
    console.error('Throughput error:', e.message);
    if (dlEl) dlEl.textContent = 'Error';
    if (ulEl) ulEl.textContent = 'Error';
  }
}

