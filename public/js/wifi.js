/**
 * NetScope Pro — Módulo WiFi
 * Renderizado de redes WiFi, mapa de canales y recomendación de canales
 */

function renderWifi() {
  document.querySelectorAll('.wtab').forEach(el => el.classList.remove('active'));
  const activeId = currentWifiTab === '2.4' ? 'tab24' : currentWifiTab === '5' ? 'tab5' : 'tabAll';
  document.getElementById(activeId)?.classList.add('active');

  let nets = allWifi;
  if (currentWifiTab === '2.4') nets = nets.filter(n => n.frequency?.includes('2.4'));
  else if (currentWifiTab === '5') nets = nets.filter(n => n.frequency?.includes('5'));

  nets.sort((a, b) => (b.signal || 0) - (a.signal || 0));

  const container = document.getElementById('wifiList');
  if (!container) return;

  if (nets.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px;height:28px;opacity:0.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><circle cx="12" cy="20" r="1"/></svg></div>
      <p>${allWifi.length ? 'Sin redes en esta banda' : 'Escaneando redes WiFi...'}</p></div>`;
    return;
  }

  container.innerHTML = nets.map(n => buildWifiCard(n)).join('');
}

function buildWifiCard(n) {
  const signal = n.signal || 0;
  const activeBars = Math.round(signal / 20);
  const signalClass = signal >= 60 ? 'good' : signal >= 30 ? 'fair' : 'poor';
  const bars = [1,2,3,4,5].map(i =>
    `<span${i <= activeBars ? ' class="active"' : ''}></span>`).join('');

  const secOpen = !n.security || n.security === 'Open' || n.security === 'Abierta';
  const secClass = secOpen ? 'open' : '';
  const secLabel = secOpen ? 'Abierta' : (n.security || '—');
  const congClass = n.congestion === 'Alta' || n.congestion === 'High' ? 'Alta'
    : n.congestion === 'Media' || n.congestion === 'Medium' ? 'Media' : 'Baja';

  const distStr = n.estimatedDistance ? `~${n.estimatedDistance.toFixed(1)}m` : '—';
  const fsplStr = n.fspl ? `${n.fspl} dB` : '—';

  const iconDist = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:11px;height:11px;vertical-align:middle;margin-right:3px"><path d="M2 12h20M12 2v20"/><circle cx="12" cy="12" r="3"/></svg>';
  const iconFspl = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:11px;height:11px;vertical-align:middle;margin-right:3px"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>';
  const iconRadio = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:11px;height:11px;vertical-align:middle;margin-right:3px"><path d="M12 20v-6M6 14l6-8 6 8"/><rect x="4" y="14" width="16" height="6" rx="2"/></svg>';

  return `<div class="wifi-card fade-in">
    <div class="wifi-card-header">
      <div>
        <div class="wifi-ssid">${escapeHtml(n.ssid || '(Oculta)')}</div>
        <div class="wifi-bssid">${n.bssid || '—'}</div>
      </div>
      <div class="wifi-signal-wrap">
        <div class="wifi-signal-bars ${signalClass}">${bars}</div>
        <span class="wifi-rssi">${n.rssi ?? '—'} dBm</span>
      </div>
    </div>
    <div class="wifi-meta">
      <span class="wifi-tag ch">Ch ${n.channel || '?'}</span>
      <span class="wifi-tag freq">${n.frequency || '?'}</span>
      <span class="wifi-tag sec ${secClass}">${secLabel}</span>
      <span class="wifi-tag cong ${congClass}">Congestión: ${n.congestion || '?'}</span>
      <span class="wifi-tag" style="background:rgba(255,255,255,0.05);color:var(--text-sec)">${signal}%</span>
    </div>
    <div class="wifi-propagation">
      <span class="prop-tag dist">${iconDist}${distStr}</span>
      <span class="prop-tag fspl">${iconFspl}FSPL: ${fsplStr}</span>
      ${n.radioType && n.radioType !== 'Unknown' && n.radioType !== 'Desconocido' ? `<span class="prop-tag radio">${iconRadio}${escapeHtml(n.radioType)}</span>` : ''}
    </div>
  </div>`;
}

function setWifiTab(tab) {
  currentWifiTab = tab;
  renderWifi();
}

// Escanear WiFi manualmente (botón "Escanear Ahora")
function requestWifiScan() {
  if (socket) {
    socket.emit('request_wifi_scan');
    // Mostrar feedback visual
    const btn = document.querySelector('.btn-scan-wifi');
    if (btn) {
      const originalText = btn.innerHTML;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;vertical-align:middle;margin-right:3px;animation:spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Escaneando...';
      btn.disabled = true;
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 3000);
    }
  }
}

function renderChannelMap() {
  const chCount24 = {};
  const chCount5 = {};

  for (const n of allWifi) {
    const ch = n.channel || 0;
    if (n.frequency?.includes('5')) {
      chCount5[ch] = (chCount5[ch] || 0) + 1;
    } else {
      chCount24[ch] = (chCount24[ch] || 0) + 1;
    }
  }

  const bars24 = document.getElementById('channelBars24');
  if (!bars24) return;
  bars24.innerHTML = '';
  const max24 = Math.max(...Object.values(chCount24), 1);
  for (let i = 1; i <= 13; i++) {
    const count = chCount24[i] || 0;
    const heightPct = count > 0 ? Math.max(10, Math.round((count / max24) * 100)) : 0;
    const cls = count === 0 ? '' : count <= 2 ? 'low' : count <= 4 ? 'med' : 'high';
    bars24.innerHTML += `<div class="ch-bar-wrap">
      <div class="ch-bar ${cls}" style="height:${heightPct}%" title="Canal ${i}: ${count} redes"></div>
      <div class="ch-label">${i}</div>
    </div>`;
  }

  const bars5 = document.getElementById('channelBars5');
  if (!bars5) return;
  bars5.innerHTML = '';
  const ch5Keys = Object.keys(chCount5).sort((a, b) => a - b);
  if (ch5Keys.length === 0) {
    bars5.innerHTML = '<span style="font-size:11px;color:var(--text-dim)">Sin redes 5GHz detectadas</span>';
    return;
  }
  const max5 = Math.max(...Object.values(chCount5), 1);
  for (const ch of ch5Keys) {
    const count = chCount5[ch];
    const heightPct = Math.max(10, Math.round((count / max5) * 100));
    const cls = count <= 1 ? 'low' : count <= 2 ? 'med' : 'high';
    bars5.innerHTML += `<div class="ch-bar-wrap">
      <div class="ch-bar ${cls}" style="height:${heightPct}%" title="Canal ${ch}: ${count} redes"></div>
      <div class="ch-label">${ch}</div>
    </div>`;
  }
}

function renderChannelRecommendation(rec) {
  if (!rec || !rec.recommended24 || !rec.recommended5) return;
  const wrap = document.getElementById('channelRecommendation');
  if (!wrap) return;
  wrap.style.display = 'block';

  const rec24 = document.getElementById('recChannel24');
  const rec5 = document.getElementById('recChannel5');
  const det24 = document.getElementById('recDetail24');
  const det5 = document.getElementById('recDetail5');

  if (rec24) rec24.textContent = `Canal ${rec.recommended24.channel}`;
  if (det24) det24.textContent =
    rec.recommended24.interference === 0 ? 'Sin interferencia' : `Interferencia: ${rec.recommended24.interference}`;

  if (rec5) rec5.textContent = `Canal ${rec.recommended5.channel}`;
  if (det5) det5.textContent =
    rec.recommended5.interference === 0 ? 'Sin interferencia' : `Interferencia: ${rec.recommended5.interference}`;
}
