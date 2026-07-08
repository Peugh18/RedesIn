/**
 * NetDiag — Módulo de Test de Velocidad (Speedtest Real)
 * Procesa los resultados de latencia, jitter y ancho de banda
 */

let speedtestRunning = false;

function renderSpeedtest() {
  // Renderizar la lista de dispositivos conectados
  const listEl = document.getElementById('speedtestDevicesList');
  if (!listEl) return;

  const activeOthers = (allDevices || []).filter(d => d.status === 'online' && d.ip !== '127.0.0.1');

  if (activeOthers.length === 0) {
    listEl.innerHTML = '<div style="font-size:11px;color:var(--text-dim);">No se detectan otros equipos activos consumiendo red.</div>';
    return;
  }

  listEl.innerHTML = activeOthers.map(d => `
    <div style="background:var(--bg-dark); padding:8px 12px; border-radius:6px; display:flex; justify-content:space-between; align-items:center; border: 1px solid var(--border-color);">
      <div>
        <div style="font-size:12px;font-weight:500;color:var(--text-main);">${escapeHtml(d.ip)}</div>
        <div style="font-size:10px;color:var(--text-sec);">${escapeHtml(d.hostname || 'Desconocido')}</div>
      </div>
      <span style="font-size:10px;background:rgba(255,167,38,0.1);color:var(--warning);padding:2px 6px;border-radius:4px;">
        Activo (Lat: ${d.latency !== null ? d.latency.toFixed(0) + 'ms' : '—'})
      </span>
    </div>
  `).join('');
}

async function startRealSpeedTest() {
  if (speedtestRunning) return;
  speedtestRunning = true;

  const btn = document.getElementById('btnStartSpeedTest');
  const stageEl = document.getElementById('speedStage');
  const valEl = document.getElementById('speedValue');
  const circle = document.getElementById('speedProgressCircle');
  
  // Limpiar resultados anteriores
  document.getElementById('resultDownload').textContent = '— Mbps';
  document.getElementById('resultUpload').textContent = '— Mbps';
  document.getElementById('resultLatency').textContent = '— ms';
  document.getElementById('resultJitter').textContent = '— ms';
  document.getElementById('speedtestStatusContent').innerHTML = '<div class="spin-icon" style="margin: 0 auto; width: 24px; height: 24px;"></div> Realizando pruebas de red en vivo...';

  if (btn) btn.disabled = true;

  // Animación del velocímetro
  let simSpeed = 0;
  const interval = setInterval(() => {
    simSpeed += (Math.random() * 15 - 5);
    if (simSpeed < 5) simSpeed = 5;
    if (simSpeed > 90) simSpeed = 90;
    
    if (valEl) valEl.textContent = simSpeed.toFixed(2);
    if (circle) {
      // 502 es el dasharray total. El offset indica cuánto se dibuja.
      const offset = 502 - (502 * (simSpeed / 100));
      circle.style.strokeDashoffset = offset;
    }
  }, 100);

  try {
    if (stageEl) stageEl.textContent = 'Midiendo Latencia...';
    // Esperar unos segundos para simular las fases del test real
    await new Promise(r => setTimeout(r, 1500));

    if (stageEl) stageEl.textContent = 'Probando Descarga...';
    await new Promise(r => setTimeout(r, 1500));

    if (stageEl) stageEl.textContent = 'Probando Subida...';

    const res = await fetch('/api/speedtest');
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error("RESTART_REQUIRED");
      }
      throw new Error(`HTTP Error: ${res.status}`);
    }
    
    let data;
    try {
      data = await res.json();
    } catch(jsonErr) {
      throw new Error("JSON_PARSE_ERROR");
    }

    clearInterval(interval);

    if (data && data.success) {
      // Dibujar resultado final de descarga
      if (valEl) valEl.textContent = data.download.toFixed(2);
      if (circle) {
        const offset = 502 - (502 * (data.download / 100));
        circle.style.strokeDashoffset = offset;
      }

      document.getElementById('resultDownload').textContent = `${data.download} Mbps`;
      document.getElementById('resultUpload').textContent = `${data.upload} Mbps`;
      document.getElementById('resultLatency').textContent = `${data.latency} ms`;
      document.getElementById('resultJitter').textContent = `${data.jitter} ms`;

      if (stageEl) stageEl.textContent = 'Completado';

      // Análisis basado en las diapositivas
      analyzeSpeedtestResults(data);
    } else {
      throw new Error("Respuesta no válida del backend");
    }
  } catch (e) {
    clearInterval(interval);
    console.error(e);
    if (stageEl) stageEl.textContent = 'Error';
    if (valEl) valEl.textContent = '0.00';
    if (circle) circle.style.strokeDashoffset = 502;
    
    if (e.message === "RESTART_REQUIRED" || e.message === "JSON_PARSE_ERROR") {
      document.getElementById('speedtestStatusContent').innerHTML = `
        <span style="color:var(--warning); font-weight:600; display:block; margin-bottom:8px;">⚠️ Servidor desactualizado (Código 404)</span>
        <span style="color:var(--text-sec);">Para aplicar la nueva ruta del Test de Velocidad, por favor **reinicia el servidor Node** en tu consola de terminal haciendo:</span>
        <ol style="margin-top:6px; padding-left:20px; color:var(--text-sec);">
          <li>Presiona <strong>Ctrl + C</strong> en la ventana negra de la terminal.</li>
          <li>Escribe <strong>npm start</strong> y presiona Enter.</li>
          <li>Refresca esta página (F5) e inicia el test.</li>
        </ol>
      `;
    } else {
      document.getElementById('speedtestStatusContent').innerHTML = `<span style="color:var(--red);">Error ejecutando el test: ${e.message}. Verifique su conexión de red.</span>`;
    }
  } finally {
    speedtestRunning = false;
    if (btn) btn.disabled = false;
  }
}

function analyzeSpeedtestResults(data) {
  const statusEl = document.getElementById('speedtestStatusContent');
  if (!statusEl) return;

  // Clasificación de Latencia (Slide 16)
  let latStatus = '';
  let latColor = '';
  let latL1Desc = '';
  if (data.latency < 20) {
    latStatus = 'Excelente';
    latColor = 'var(--green)';
    latL1Desc = 'La respuesta de red es óptima. Las aplicaciones interactivas funcionarán sin problemas.';
  } else if (data.latency <= 80) {
    latStatus = 'Aceptable';
    latColor = 'var(--yellow)';
    latL1Desc = 'Latencia dentro de límites operativos. Posible congestión leve en la ruta.';
  } else {
    latStatus = 'Deficiente (Alta Latencia)';
    latColor = 'var(--red)';
    latL1Desc = 'Retardo crítico detectado en el transporte de paquetes. El usuario experimentará lentitud extrema.';
  }

  // Clasificación de Jitter (Slide 11)
  let jitterStatus = '';
  let jitterColor = '';
  let jitterL1Desc = '';
  if (data.jitter < 5) {
    jitterStatus = 'Excelente (Estable)';
    jitterColor = 'var(--green)';
    jitterL1Desc = 'Variación de ping insignificante. La conexión es sumamente estable.';
  } else if (data.jitter <= 20) {
    jitterStatus = 'Moderado';
    jitterColor = 'var(--yellow)';
    jitterL1Desc = 'Variación perceptible. Típico de redes Wi-Fi con interferencias menores.';
  } else {
    jitterStatus = 'Crítico (Inestable)';
    jitterColor = 'var(--red)';
    jitterL1Desc = 'Fluctuación severa en el tiempo de entrega de paquetes (Jitter). Causa cortes de voz y video.';
  }

  // Medio de conexión (Slide 17)
  const isWifi = data.connectionType.toLowerCase().includes('wi-fi') || 
                 data.connectionType.toLowerCase().includes('wlan') || 
                 data.connectionType.toLowerCase().includes('wireless');

  let medioL1Diagnostico = '';
  let medioL1Accion = '';
  if (isWifi) {
    medioL1Diagnostico = 'El usuario está conectado por enlace Inalámbrico (Wi-Fi).';
    medioL1Accion = 'La conexión Wi-Fi es propensa a atenuación y pérdida por obstáculos. **Pídele al usuario conectarse por cable Ethernet** o acercarse al Access Point para validar rendimiento.';
  } else {
    medioL1Diagnostico = 'El usuario está conectado por Cable (Ethernet).';
    medioL1Accion = 'El medio físico es óptimo y guiado. Si hay lentitud, se descarta atenuación de señal en el aire.';
  }

  // Concurrencia de red
  const activeCount = (allDevices || []).filter(d => d.status === 'online' && d.ip !== '127.0.0.1').length;
  let concurrenciaL1Desc = '';
  let concurrenciaL1Accion = '';
  if (activeCount > 8) {
    concurrenciaL1Desc = `Se detectaron ${activeCount} equipos activos consumiendo tráfico en el mismo segmento de red de manera simultánea.`;
    concurrenciaL1Accion = `**Tráfico concurrente detectado.** Recomienda limitar descargas masivas en segundo plano en otros equipos o configurar priorización de tráfico (QoS) en el switch principal.`;
  } else {
    concurrenciaL1Desc = `Baja concurrencia en la red local (${activeCount} equipos activos).`;
    concurrenciaL1Accion = `El canal no presenta congestión por otros hosts locales activos.`;
  }

  // Solución Concreta para L1
  let diagnosticoGlobal = 'Conexión Estable';
  let severidadGlobal = 'var(--green)';
  let accionGlobal = 'No se requieren acciones correctivas. El canal de comunicación se encuentra en estado óptimo.';

  if (data.latency > 80 || data.jitter > 20) {
    diagnosticoGlobal = 'Degradación de Calidad de Enlace';
    severidadGlobal = 'var(--red)';
    accionGlobal = `1. ${isWifi ? 'Migrar al usuario a conexión física por cable.' : 'Revisar puertos de switch por colisiones.'} \n2. Ejecutar ping continuo al Gateway para verificar si la degradación es de origen LAN o WAN.`;
  } else if (data.download < 15) {
    diagnosticoGlobal = 'Ancho de Banda Insuficiente';
    severidadGlobal = 'var(--orange)';
    accionGlobal = `1. Verificar que el usuario no tenga descargas masivas o streaming activo en segundo plano.\n2. Solicitar al administrador de red revisar los límites de tráfico asignados en el firewall perimetral.`;
  } else if (isWifi && data.download < 35) {
    diagnosticoGlobal = 'Atenuación de Cobertura Inalámbrica';
    severidadGlobal = 'var(--yellow)';
    accionGlobal = 'El usuario presenta una velocidad reducida en enlace Wi-Fi. Solicitar cambio de canal o reubicación física del equipo receptor.';
  }

  statusEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <!-- CABECERA DE INCIDENTE -->
      <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; border-left: 4px solid ${severidadGlobal};">
        <div style="font-size: 11px; text-transform: uppercase; color: var(--text-sec); font-weight: 600;">Diagnóstico del Incidente L1</div>
        <div style="font-size: 15px; font-weight: bold; color: var(--text-main); margin-top: 2px;">${diagnosticoGlobal}</div>
      </div>

      <!-- ACCIÓN CONCRETA (SOLUCIÓN) -->
      <div>
        <div style="font-size: 11px; text-transform: uppercase; color: var(--green); font-weight: 600; margin-bottom: 4px;">Acción de Solución Inmediata</div>
        <div style="font-size: 13px; font-weight: 500; color: var(--text-main); background: rgba(0, 200, 83, 0.05); padding: 10px; border-radius: 6px; border: 1px solid rgba(0,200,83,0.15); white-space: pre-line;">${accionGlobal}</div>
      </div>

      <!-- FACTORES DE ANÁLISIS -->
      <div style="font-size: 11px; text-transform: uppercase; color: var(--text-sec); font-weight: 600; margin-bottom: 2px;">Sustento de Diagnóstico Técnico</div>
      
      <div style="display:flex; flex-direction:column; gap:6px; font-size:12px; color:var(--text-sec);">
        <div>
          <strong style="color:var(--text-main);">1. Tipo de Medio:</strong> ${medioL1Diagnostico}<br>
          <span style="font-size:11px; color:var(--text-dim);">${medioL1Accion}</span>
        </div>
        <div>
          <strong style="color:var(--text-main);">2. Concurrencia de Red:</strong> ${concurrenciaL1Desc}<br>
          <span style="font-size:11px; color:var(--text-dim);">${concurrenciaL1Accion}</span>
        </div>
        <div>
          <strong style="color:var(--text-main);">3. Estabilidad Temporal:</strong> Latencia <span style="color:${latColor}; font-weight:600;">${latStatus}</span> y Jitter <span style="color:${jitterColor}; font-weight:600;">${jitterStatus}</span>.<br>
          <span style="font-size:11px; color:var(--text-dim);">${latL1Desc} ${jitterL1Desc}</span>
        </div>
      </div>

      <hr style="border:none; border-top:1px solid var(--border-color); margin:4px 0;">
      <div style="font-size:10px; color:var(--text-dim); font-style:italic;">
        Sustento Técnico: Pruebas de velocidad mediante transferencia activa de paquetes e ICMP consecutivo.
      </div>
    </div>
  `;
}
