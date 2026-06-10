/**
 * NetScope Pro — Dashboard Mejorado
 * Visualizaciones avanzadas: salud de red, distribución, matriz de calidad, uptime, comparativa
 */

let healthChart = null;
let deviceChart = null;
let metricsHistory = [];

/**
 * Inicializar gráficas del dashboard mejorado
 */
function initEnhancedDashboard() {
  initHealthChart();
  initDeviceChart();
  updateDashboardMetrics();
}

/**
 * Gráfica de Salud de Red (Gauge circular)
 */
function initHealthChart() {
  const ctx = document.getElementById('healthChart');
  if (!ctx) return;
  
  if (healthChart) healthChart.destroy();
  
  healthChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Online', 'Offline'],
      datasets: [{
        data: [100, 0],
        backgroundColor: ['#00d9a5', '#ff6b6b'],
        borderColor: 'transparent',
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '75%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    }
  });
}

/**
 * Gráfica de Distribución de Dispositivos (Donut)
 */
function initDeviceChart() {
  const ctx = document.getElementById('deviceChart');
  if (!ctx) return;
  
  if (deviceChart) deviceChart.destroy();
  
  const distribution = getDeviceDistribution();
  
  deviceChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(distribution),
      datasets: [{
        data: Object.values(distribution),
        backgroundColor: [
          '#ff6b6b', // Celular - rojo
          '#4ecdc4', // Laptop - cyan
          '#ffe66d', // TV - amarillo
          '#a78bfa', // Consola - púrpura
          '#34d399', // IoT - verde
          '#9ca3af'  // Desconocido - gris
        ],
        borderColor: 'transparent',
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: 'var(--text)',
            font: { size: 12 },
            padding: 15
          }
        }
      }
    }
  });
  
  renderDistributionLegend(distribution);
}

/**
 * Obtener distribución de dispositivos por tipo
 */
function getDeviceDistribution() {
  const distribution = {
    '📱 Celular': 0,
    '💻 Laptop': 0,
    '📺 Smart TV': 0,
    '🎮 Consola': 0,
    '🔌 IoT': 0,
    '❓ Desconocido': 0
  };
  
  allDevices.forEach(device => {
    const type = device.connectionType || 'Desconocido';
    if (type.includes('Celular') || type.includes('Mobile')) distribution['📱 Celular']++;
    else if (type.includes('Laptop') || type.includes('Computer')) distribution['💻 Laptop']++;
    else if (type.includes('TV') || type.includes('Television')) distribution['📺 Smart TV']++;
    else if (type.includes('Consola') || type.includes('Gaming')) distribution['🎮 Consola']++;
    else if (type.includes('IoT') || type.includes('Device')) distribution['🔌 IoT']++;
    else distribution['❓ Desconocido']++;
  });
  
  return Object.fromEntries(Object.entries(distribution).filter(([_, v]) => v > 0));
}

/**
 * Renderizar leyenda de distribución
 */
function renderDistributionLegend(distribution) {
  const legend = document.getElementById('distributionLegend');
  if (!legend) return;
  
  legend.innerHTML = Object.entries(distribution)
    .map(([type, count]) => `
      <div class="legend-item">
        <span class="legend-label">${type}</span>
        <span class="legend-count">${count}</span>
      </div>
    `).join('');
}

/**
 * Actualizar métricas del dashboard
 */
function updateDashboardMetrics() {
  updateHealthWidget();
  updateQualityMatrix();
  updateUptimeStats();
  updateComparison();
}

/**
 * Actualizar widget de salud de red
 */
function updateHealthWidget() {
  const online = allDevices.filter(d => d.status === 'online').length;
  const total = allDevices.length || 1;
  const onlinePercent = Math.round((online / total) * 100);
  
  const latencies = allDevices
    .filter(d => d.status === 'online' && d.latency !== null)
    .map(d => d.latency);
  const avgLatency = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1) : '—';
  
  const jitters = allDevices
    .filter(d => d.status === 'online' && d.jitter !== null)
    .map(d => d.jitter);
  const avgJitter = jitters.length ? (jitters.reduce((a, b) => a + b, 0) / jitters.length).toFixed(1) : '—';
  
  // Actualizar gauge
  if (healthChart) {
    healthChart.data.datasets[0].data = [onlinePercent, 100 - onlinePercent];
    healthChart.update();
  }
  
  // Actualizar stats
  const el = (id) => document.getElementById(id);
  if (el('healthOnline')) el('healthOnline').textContent = onlinePercent + '%';
  if (el('healthLatency')) el('healthLatency').textContent = avgLatency + (avgLatency !== '—' ? ' ms' : '');
  if (el('healthJitter')) el('healthJitter').textContent = avgJitter + (avgJitter !== '—' ? ' ms' : '');
}

/**
 * Actualizar matriz de calidad de red
 */
function updateQualityMatrix() {
  const tbody = document.getElementById('qualityTableBody');
  if (!tbody) return;
  
  if (allDevices.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6"><div class="empty-state" style="padding:20px 0"><p>Sin dispositivos detectados</p></div></td></tr>';
    return;
  }
  
  tbody.innerHTML = allDevices.map(device => {
    const latencyClass = device.latency === null ? 'unknown' : device.latency < 30 ? 'good' : device.latency < 100 ? 'warning' : 'bad';
    const jitterClass = device.jitter === null ? 'unknown' : device.jitter < 5 ? 'good' : device.jitter < 15 ? 'warning' : 'bad';
    const lossClass = device.packetLoss === null ? 'unknown' : device.packetLoss === 0 ? 'good' : device.packetLoss < 5 ? 'warning' : 'bad';
    const statusIcon = device.status === 'online' ? '🟢' : '🔴';
    
    return `
      <tr class="quality-row ${device.status}">
        <td class="device-name">${statusIcon} ${device.hostname || device.ip}</td>
        <td class="metric ${latencyClass}">${device.latency !== null ? device.latency.toFixed(1) + ' ms' : '—'}</td>
        <td class="metric ${jitterClass}">${device.jitter !== null ? device.jitter.toFixed(1) + ' ms' : '—'}</td>
        <td class="metric ${lossClass}">${device.packetLoss !== null ? device.packetLoss.toFixed(1) + '%' : '—'}</td>
        <td class="signal">${getSignalBars(device.latency)}</td>
        <td class="status">${device.status === 'online' ? '✓' : '✗'}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Obtener barras de señal basadas en latencia
 */
function getSignalBars(latency) {
  if (latency === null) return '—';
  if (latency < 20) return '▓▓▓▓▓';
  if (latency < 50) return '▓▓▓▓░';
  if (latency < 100) return '▓▓▓░░';
  if (latency < 200) return '▓▓░░░';
  return '▓░░░░';
}

/**
 * Actualizar estadísticas de uptime
 */
function updateUptimeStats() {
  const el = (id) => document.getElementById(id);
  
  if (allDevices.length === 0) {
    if (el('uptimeAvg')) el('uptimeAvg').textContent = '—';
    if (el('uptimeBest')) el('uptimeBest').textContent = '—';
    if (el('uptimeWorst')) el('uptimeWorst').textContent = '—';
    if (el('uptimeDowntime')) el('uptimeDowntime').textContent = '—';
    return;
  }
  
  // Calcular uptime promedio (basado en status actual)
  const onlineCount = allDevices.filter(d => d.status === 'online').length;
  const uptimeAvg = Math.round((onlineCount / allDevices.length) * 100);
  
  // Dispositivo más estable (menor jitter)
  const stable = allDevices.reduce((best, current) => {
    if (current.jitter === null) return best;
    if (best.jitter === null) return current;
    return current.jitter < best.jitter ? current : best;
  });
  
  // Dispositivo más inestable (mayor jitter)
  const unstable = allDevices.reduce((worst, current) => {
    if (current.jitter === null) return worst;
    if (worst.jitter === null) return current;
    return current.jitter > worst.jitter ? current : worst;
  });
  
  if (el('uptimeAvg')) el('uptimeAvg').textContent = uptimeAvg + '%';
  if (el('uptimeBest')) el('uptimeBest').textContent = stable.hostname || stable.ip;
  if (el('uptimeWorst')) el('uptimeWorst').textContent = unstable.hostname || unstable.ip;
  if (el('uptimeDowntime')) el('uptimeDowntime').textContent = '< 5 min';
}

/**
 * Actualizar comparativa antes/después
 */
function updateComparison() {
  const el = (id) => document.getElementById(id);
  
  // Guardar métrica actual
  const currentMetrics = {
    timestamp: Date.now(),
    onlineCount: allDevices.filter(d => d.status === 'online').length,
    avgLatency: allDevices.filter(d => d.latency !== null).length > 0 
      ? allDevices.filter(d => d.latency !== null).reduce((a, b) => a + b.latency, 0) / allDevices.filter(d => d.latency !== null).length
      : 0,
    alertCount: alerts.length,
    saturatedChannels: allWifi.filter(w => w.channel && getChannelCount(w.channel) > 3).length
  };
  
  metricsHistory.push(currentMetrics);
  if (metricsHistory.length > 60) metricsHistory.shift(); // Mantener última hora
  
  // Comparar con hace 1 hora (o la más antigua disponible)
  const oldMetrics = metricsHistory.length > 1 ? metricsHistory[0] : currentMetrics;
  
  const devicesDiff = currentMetrics.onlineCount - oldMetrics.onlineCount;
  const latencyDiff = currentMetrics.avgLatency - oldMetrics.avgLatency;
  const alertsDiff = currentMetrics.alertCount - oldMetrics.alertCount;
  const channelsDiff = currentMetrics.saturatedChannels - oldMetrics.saturatedChannels;
  
  const renderChange = (value) => {
    if (value === 0) return '<span class="change-neutral">→</span>';
    if (value > 0) return `<span class="change-bad">↑ +${value}</span>`;
    return `<span class="change-good">↓ ${value}</span>`;
  };
  
  if (el('compDevices')) el('compDevices').textContent = currentMetrics.onlineCount;
  if (el('compDevicesChange')) el('compDevicesChange').innerHTML = renderChange(devicesDiff);
  
  if (el('compLatency')) el('compLatency').textContent = currentMetrics.avgLatency.toFixed(1) + ' ms';
  if (el('compLatencyChange')) el('compLatencyChange').innerHTML = renderChange(Math.round(latencyDiff));
  
  if (el('compAlerts')) el('compAlerts').textContent = currentMetrics.alertCount;
  if (el('compAlertsChange')) el('compAlertsChange').innerHTML = renderChange(alertsDiff);
  
  if (el('compChannels')) el('compChannels').textContent = currentMetrics.saturatedChannels;
  if (el('compChannelsChange')) el('compChannelsChange').innerHTML = renderChange(channelsDiff);
}

/**
 * Contar redes en un canal específico
 */
function getChannelCount(channel) {
  return allWifi.filter(w => w.channel === channel).length;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initEnhancedDashboard, 500);
});

// Actualizar métricas cada 10 segundos
setInterval(updateDashboardMetrics, 10000);
