/**
 * NetScope Pro — Conexión Socket.IO
 * Maneja la comunicación en tiempo real con el backend
 */

function initSocket() {
  socket = io();

  socket.on('connect', () => {
    setStatus('connected', 'Conectado');
  });

  socket.on('disconnect', () => {
    setStatus('error', 'Desconectado');
  });

  socket.on('devices_update', (data) => {
    if (data.devices) {
      allDevices = data.devices;
      renderDevices();
      updateMetrics();
    }
    if (data.networkInfo) updateNetInfo(data.networkInfo);
    if (data.alerts) {
      alerts = data.alerts;
      renderAlerts();
    }
    setStatus('connected', `Actualizado ${new Date().toLocaleTimeString('es-MX', { hour12: false })}`);
  });

  socket.on('wifi_update', (data) => {
    if (data.networks) {
      allWifi = data.networks;
      renderWifi();
      renderChannelMap();
      renderSecurityPanel();
      updateMetrics();
    }
    if (data.channelRecommendation) {
      renderChannelRecommendation(data.channelRecommendation);
    }
  });

  socket.on('scan_progress', (data) => {
    showScanProgress(data);
  });

  socket.on('throughput_update', (data) => {
    if (!data) return;
    const dlEl = document.getElementById('tpDownload');
    const ulEl = document.getElementById('tpUpload');
    const latEl = document.getElementById('tpLatency');
    const tgtEl = document.getElementById('tpTarget');
    if (dlEl) dlEl.textContent = data.download || '0';
    if (ulEl) ulEl.textContent = data.upload || '0';
    if (latEl) latEl.textContent = data.latency || '--';
    if (tgtEl) tgtEl.textContent = data.target || '--';
  });

  socket.on('traffic_rate_update', (data) => {
    if (!data) return;
    if (typeof updateTrafficDataReal === 'function') {
      updateTrafficDataReal(data.download, data.upload);
    }
  });
}

function setStatus(type, text) {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  if (!dot || !txt) return;
  dot.className = 'status-dot';
  if (type === 'connected') dot.classList.add('pulse');
  else if (type === 'scanning') dot.classList.add('scanning');
  else if (type === 'error') dot.classList.add('error');
  txt.textContent = text;
}

function updateNetInfo(info) {
  const el = (id) => document.getElementById(id);
  if (el('localIP')) el('localIP').textContent = info.localIP || '—';
  if (el('gateway')) el('gateway').textContent = info.gateway || '—';
  if (el('activeInterface')) el('activeInterface').textContent = info.activeInterface || '—';
}

function updateMetrics() {
  const online = allDevices.filter(d => d.status === 'online');
  const offline = allDevices.filter(d => d.status === 'offline');
  const latencies = online.map(d => d.latency).filter(l => l !== null && l !== undefined);
  const avgPing = latencies.length
    ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1)
    : '—';

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('totalDevices', allDevices.length);
  set('onlineDevices', online.length);
  set('offlineDevices', offline.length);
  set('wifiCount', allWifi.length);
  set('alertCount', alerts.length);

  const avgEl = document.getElementById('avgPing');
  if (avgEl) avgEl.innerHTML = avgPing !== '—' ? `${avgPing}<span style="font-size:0.5em;opacity:0.6">ms</span>` : '—';

  const badge = document.getElementById('alertBadge');
  if (badge) badge.textContent = alerts.length;
  const navBadge = document.getElementById('navAlertBadge');
  if (navBadge) navBadge.textContent = alerts.length;
}

function requestScan() {
  if (!socket?.connected) return;
  socket.emit('request_scan');
  setStatus('scanning', 'Escaneando...');
  const btn = document.getElementById('btnScan');
  if (btn) btn.classList.add('scanning');
  const wrap = document.getElementById('scanProgressWrap');
  if (wrap) wrap.style.display = 'block';
  setTimeout(() => { if (btn) btn.classList.remove('scanning'); }, 30000);
}

function showScanProgress(data) {
  const wrap = document.getElementById('scanProgressWrap');
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('scanProgressText');
  if (!wrap || !fill || !text) return;
  wrap.style.display = 'block';
  const pct = data.total > 0 ? Math.round((data.found / data.total) * 100) : 0;
  fill.style.width = pct + '%';
  text.textContent = data.status || `Encontrados: ${data.found} dispositivos`;
  if (pct >= 100 || data.status === 'done') {
    setTimeout(() => { wrap.style.display = 'none'; fill.style.width = '0%'; }, 2000);
  }
}

async function loadInitialState() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.devices?.length) {
      allDevices = data.devices;
      renderDevices();
    }
    if (data.wifiNetworks?.length) {
      allWifi = data.wifiNetworks;
      renderWifi();
    }
    if (data.alerts?.length) {
      alerts = data.alerts;
      renderAlerts();
    }
    if (data.networkInfo) updateNetInfo(data.networkInfo);
    if (data.channelRecommendation) renderChannelRecommendation(data.channelRecommendation);
    renderSecurityPanel();
    updateMetrics();
  } catch (e) {
    setStatus('error', 'No se puede conectar al servidor');
  }
}
