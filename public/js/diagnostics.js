/**
 * NetDiag — Módulo de Diagnóstico Frontend
 * Maneja la solicitud de diagnósticos y el renderizado del Informe Técnico
 */

let currentDiagnosticReport = null;

/**
 * Solicita al servidor correr el motor de diagnóstico para una IP
 */
function requestDiagnosticFor(ip, event = null) {
  if (event && event.stopPropagation) {
    event.stopPropagation();
  }
  if (!socket?.connected) {
    alert("Error: No hay conexión con el servidor.");
    return;
  }
  
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalOverlay = document.getElementById('modalOverlay');
  
  if (modalTitle && modalBody && modalOverlay) {
    modalTitle.textContent = "Analizando Dispositivo...";
    modalBody.innerHTML = `
      <div style="padding: 40px; text-align: center;">
        <div class="spin-icon" style="margin: 0 auto 20px auto; width: 40px; height: 40px; border-width: 4px;"></div>
        <p style="color: var(--text-sec)">Ejecutando Motor de Reglas para ${escapeHtml(ip)}...</p>
      </div>
    `;
    modalOverlay.style.display = ''; // Limpiar inline style si existe
    modalOverlay.classList.add('open');
  }

  socket.emit('request_diagnostic', ip);
}

/**
 * Renderiza el Informe Técnico de Diagnóstico en el Modal
 */
function renderDiagnosticReport(report) {
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalOverlay = document.getElementById('modalOverlay');
  
  if (!modalTitle || !modalBody || !modalOverlay) return;

  if (report.error) {
    modalTitle.textContent = "Error de Diagnóstico";
    modalBody.innerHTML = `<p style="padding:20px; color:var(--red);">${escapeHtml(report.message)}</p>`;
    return;
  }

  modalTitle.textContent = "Informe Técnico de Diagnóstico";

  const sevColors = {
    'Crítica': 'var(--red)',
    'Alta': 'var(--orange)',
    'Media': 'var(--yellow)',
    'Baja': 'var(--cyan)',
    'Informativa': 'var(--green)'
  };
  const sevColor = sevColors[report.diagnostico_tecnico.severidad] || 'var(--text-main)';

  const evidenciasHTML = report.evidencias_tecnicas.map(e => `<li>${escapeHtml(e)}</li>`).join('');

  const html = `
    <div class="diagnostic-report" style="font-family: var(--font-main); text-align: left;">
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 15px;">
        <div>
          <span style="color: var(--text-dim); font-size: 11px;">ID INFORME</span><br/>
          <span class="mono" style="font-size: 12px; font-weight: bold;">${escapeHtml(report.id_diagnostico)}</span>
        </div>
        <div style="text-align: right;">
          <span style="color: var(--text-dim); font-size: 11px;">FECHA</span><br/>
          <span class="mono" style="font-size: 12px;">${new Date(report.fecha_hora_analisis).toLocaleString()}</span>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="color: var(--text-sec); text-transform: uppercase; font-size: 11px; margin-bottom: 5px;">Dispositivo Evaluado</h4>
        <div style="background: var(--bg-card); padding: 10px; border-radius: 6px; border: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between;">
            <span class="mono">${escapeHtml(report.dispositivo_evaluado.ip)}</span>
            <span class="mono" style="color: var(--text-sec)">${escapeHtml(report.dispositivo_evaluado.mac)}</span>
          </div>
          <div style="font-size: 12px; color: var(--text-dim); margin-top: 5px;">
            ${escapeHtml(report.dispositivo_evaluado.hostname)} | ${escapeHtml(report.dispositivo_evaluado.fabricante)}
          </div>
        </div>
      </div>

      <div style="margin-bottom: 20px; border-left: 4px solid ${sevColor}; padding-left: 15px;">
        <h4 style="color: var(--text-sec); text-transform: uppercase; font-size: 11px; margin-bottom: 5px;">Causa Probable</h4>
        <p style="font-weight: 500; font-size: 15px; margin-bottom: 5px; color: var(--text-main)">${escapeHtml(report.diagnostico_tecnico.causa_probable)}</p>
        <div style="display: flex; gap: 15px; font-size: 12px;">
          <span style="color: var(--text-dim)">Confianza: <strong style="color: var(--cyan)">${escapeHtml(report.diagnostico_tecnico.nivel_confianza)}</strong></span>
          <span style="color: var(--text-dim)">Severidad: <strong style="color: ${sevColor}">${escapeHtml(report.diagnostico_tecnico.severidad)}</strong></span>
        </div>
        <p style="font-size: 11px; color: var(--text-dim); margin-top: 5px; font-style: italic;">Regla: ${escapeHtml(report.diagnostico_tecnico.regla_aplicada)}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="color: var(--text-sec); text-transform: uppercase; font-size: 11px; margin-bottom: 5px;">Evidencias Técnicas</h4>
        <ul style="background: rgba(0,0,0,0.2); padding: 15px 15px 15px 30px; border-radius: 6px; font-size: 13px; color: var(--text-main); margin: 0;">
          ${evidenciasHTML}
        </ul>
      </div>

      <div style="margin-bottom: 25px; background: rgba(0, 200, 83, 0.1); border: 1px solid rgba(0, 200, 83, 0.3); padding: 15px; border-radius: 6px;">
        <h4 style="color: var(--green); text-transform: uppercase; font-size: 11px; margin-bottom: 8px;">Asistencia Operativa</h4>
        <p style="font-size: 14px; font-weight: 500; margin-bottom: 10px;">Acción: ${escapeHtml(report.asistencia_operativa.accion_sugerida)}</p>
        <p style="font-size: 12px; color: var(--text-sec); border-top: 1px solid rgba(0, 200, 83, 0.2); padding-top: 10px; margin: 0;">
          Sugerencia de Escalamiento: <strong>${escapeHtml(report.asistencia_operativa.nivel_escalamiento_sugerido)}</strong>
        </p>
      </div>

      <!-- TRACEROUTE VISUAL -->
      <div id="traceroutePanel" style="margin-top: 20px; padding: 15px; background: rgba(0, 188, 212, 0.04); border: 1px solid rgba(0,188,212,0.2); border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h4 style="color: var(--cyan); text-transform: uppercase; font-size: 11px; display: flex; align-items: center; gap: 5px; margin: 0;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><circle cx="12" cy="12" r="3"/><path d="M2 12h7M15 12h7M12 2v7M12 15v7"/></svg>
            Ruta de Red (Traceroute)
          </h4>
          <button class="btn" id="btnRunTraceroute" onclick="runTracerouteFor('${report.dispositivo_evaluado.ip}')" style="background:var(--cyan);color:#fff;border:none;padding:4px 10px;font-size:11px;cursor:pointer;">Ejecutar</button>
        </div>
        <div id="tracerouteResult" style="font-size: 12px; color: var(--text-sec);">
          Haz clic en Ejecutar para trazar la ruta hacia <strong style="color:var(--text-main);">${escapeHtml(report.dispositivo_evaluado.ip)}</strong> y detectar dónde se produce la falla de conectividad.
        </div>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
        <button class="btn" style="background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color);" onclick="closeDiagnosticModal()">Cerrar</button>
        <button class="btn" style="background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color);" onclick="copyDiagnosticToClipboard()">Copiar (Ticket)</button>
        <button class="btn" style="background: var(--cyan); color: #fff; border: none;" onclick="requestDiagnosticFor('${report.dispositivo_evaluado.ip}')">Re-Evaluar</button>
        <button class="btn" style="background: var(--green); color: #fff; border: none;" onclick="saveDiagnosticReport()">Guardar Informe</button>
      </div>

      <div id="diagnosticHistorySection" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color); display: none;">
        <h3 style="font-size: 14px; font-weight: 600; color: var(--text-main); margin-bottom: 10px;">Historial Reciente (Mismo Equipo)</h3>
        <div id="diagnosticHistoryList" style="display: flex; flex-direction: column; gap: 8px;">
          <!-- Items del historial irán aquí -->
        </div>
      </div>
    </div>
  `;

  modalBody.innerHTML = html;
  modalOverlay.style.display = '';
  modalOverlay.classList.add('open');

  // Fetch historial
  fetch(`/api/history/${report.dispositivo_evaluado.ip}`)
    .then(res => res.json())
    .then(history => {
      // Filtrar el actual para no repetirlo
      const pastHistory = history.filter(h => h.id_diagnostico !== report.id_diagnostico);
      if (pastHistory.length > 0) {
        document.getElementById('diagnosticHistorySection').style.display = 'block';
        const list = document.getElementById('diagnosticHistoryList');
        list.innerHTML = pastHistory.map(h => {
          let sevColor = 'var(--green)';
          if(h.diagnostico_tecnico.severidad === 'Crítica') sevColor = 'var(--red)';
          else if(h.diagnostico_tecnico.severidad === 'Alta') sevColor = 'var(--orange)';
          else if(h.diagnostico_tecnico.severidad === 'Media') sevColor = 'var(--yellow)';

          return `<div style="background: var(--bg-dark); padding: 10px; border-radius: 6px; border-left: 4px solid ${sevColor}; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 12px; font-weight: 500; color: var(--text-main);">${h.diagnostico_tecnico.causa_probable}</div>
              <div style="font-size: 11px; color: var(--text-sec); margin-top: 4px;">ID: ${h.id_diagnostico}</div>
            </div>
            <div style="font-size: 11px; color: var(--text-dim); text-align: right;">
              <div>${new Date(h.fecha_hora_analisis).toLocaleDateString()}</div>
              <div>${new Date(h.fecha_hora_analisis).toLocaleTimeString()}</div>
            </div>
          </div>`;
        }).join('');
      }
    })
    .catch(err => console.error("Error loading history:", err));
}

/**
 * Cierra el modal limpiando estilos en línea residuales
 */
function closeDiagnosticModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.style.display = '';
    modalOverlay.classList.remove('open');
  }
}

/**
 * Guarda el informe actual en el backend
 */
function saveDiagnosticReport() {
  if (!currentDiagnosticReport) return;
  socket.emit('save_diagnostic_report', currentDiagnosticReport);
  closeDiagnosticModal();
  alert('Informe guardado correctamente en incidents.json');
}

/**
 * Copia un resumen del informe al portapapeles para uso en tickets
 */
function copyDiagnosticToClipboard() {
  if (!currentDiagnosticReport) return;
  const rep = currentDiagnosticReport;
  const txt = `--- INFORME TÉCNICO NETDIAG L1 ---
ID: ${rep.id_diagnostico}
Fecha: ${new Date(rep.fecha_hora_analisis).toLocaleString()}

DISPOSITIVO: ${rep.dispositivo_evaluado.ip} (${rep.dispositivo_evaluado.hostname})
CAUSA PROBABLE: ${rep.diagnostico_tecnico.causa_probable}
SEVERIDAD: ${rep.diagnostico_tecnico.severidad}

EVIDENCIA:
- ${rep.evidencias_tecnicas.join('\n- ')}

ACCIÓN SUGERIDA: ${rep.asistencia_operativa.accion_sugerida}
ESCALAMIENTO: ${rep.asistencia_operativa.nivel_escalamiento_sugerido}`;

  navigator.clipboard.writeText(txt).then(() => {
    alert("¡Diagnóstico copiado al portapapeles listo para el Ticket!");
  });
}

/**
 * Ejecuta un traceroute hacia la IP del dispositivo y muestra los saltos con diagnóstico L1
 */
async function runTracerouteFor(ip) {
  const resultEl = document.getElementById('tracerouteResult');
  const btn = document.getElementById('btnRunTraceroute');
  if (!resultEl) return;

  if (btn) { btn.disabled = true; btn.textContent = 'Trazando...'; }

  resultEl.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; color:var(--text-sec);">
      <div class="spin-icon" style="width:14px;height:14px;border-width:2px;"></div>
      Ejecutando traceroute hacia ${escapeHtml(ip)}...
    </div>`;

  try {
    const res = await fetch(`/api/traceroute/${encodeURIComponent(ip)}`);
    if (!res.ok) throw new Error('Error en la respuesta del servidor');
    const data = await res.json();

    if (!data.hops || data.hops.length === 0) {
      resultEl.innerHTML = `<span style="color:var(--red);">Sin respuesta de ruta. El dispositivo puede estar bloqueando ICMP o fuera de alcance.</span>`;
      return;
    }

    const gateway = data.hops.length > 0 ? data.hops[0].ip : '?';

    let firstFailHop = null;
    let diagText = 'Ruta completa. Conectividad verificada en todos los saltos.';
    let diagColor = 'var(--green)';

    const hopsHTML = data.hops.map((hop, idx) => {
      const latencyMs = hop.time ?? null;
      const hopIp = hop.ip || '*';
      const isFail = hopIp === '*' || hop.timeout;

      let hopColor = 'var(--green)';
      let hopLabel = '';

      if (isFail) {
        hopColor = 'var(--red)';
        hopLabel = 'SIN RESPUESTA';
        if (!firstFailHop) {
          firstFailHop = idx + 1;
          if (idx === 0) {
            diagText = 'Falla en el PRIMER salto. El dispositivo no alcanza el switch/gateway local. Verificar cable o puerto de switch.';
          } else if (idx === 1) {
            diagText = 'Falla en el SEGUNDO salto (Gateway/Router). Posible problema en el enrutador local o la tabla de rutas.';
          } else {
            diagText = `Falla en el salto ${idx + 1}. El problema está fuera del segmento local (proveedor ISP o ruta WAN intermedia).`;
          }
          diagColor = 'var(--red)';
        }
      } else if (latencyMs !== null && latencyMs > 150) {
        hopColor = 'var(--orange)';
        hopLabel = 'LATENCIA ALTA';
        if (!firstFailHop && diagColor === 'var(--green)') {
          diagText = `Latencia elevada en salto ${idx + 1}. Posible congestión en ese nodo de red.`;
          diagColor = 'var(--orange)';
        }
      } else if (latencyMs !== null && latencyMs > 50) {
        hopColor = 'var(--yellow)';
      }

      return `
        <div style="display:flex; align-items:center; gap:8px; padding: 6px 0; border-bottom: 1px solid var(--border-color);">
          <span style="width:22px; height:22px; border-radius:50%; background:${hopColor}22; border: 1px solid ${hopColor}; color:${hopColor}; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${idx + 1}</span>
          <div style="flex:1; min-width:0;">
            <div style="font-size:12px; color:var(--text-main); font-weight: 500;">${escapeHtml(hopIp)}</div>
            ${hopLabel ? `<div style="font-size:10px; color:${hopColor}; font-weight:600;">${hopLabel}</div>` : ''}
          </div>
          <span style="font-size:11px; color:${hopColor}; font-weight:600; flex-shrink:0;">${isFail ? '* ms' : latencyMs !== null ? latencyMs.toFixed(1) + ' ms' : '—'}</span>
        </div>`;
    }).join('');

    resultEl.innerHTML = `
      <div style="margin-bottom:10px; padding:8px; background:${diagColor}22; border:1px solid ${diagColor}55; border-radius:6px;">
        <div style="font-size:11px; text-transform:uppercase; color:${diagColor}; font-weight:700; margin-bottom:3px;">Diagnóstico de Ruta</div>
        <div style="font-size:12px; color:var(--text-main);">${diagText}</div>
      </div>
      <div style="max-height:160px; overflow-y:auto;">${hopsHTML}</div>
    `;
  } catch(e) {
    resultEl.innerHTML = `<span style="color:var(--orange);">No se pudo ejecutar el traceroute: ${escapeHtml(e.message)}</span>`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Ejecutar'; }
  }
}

