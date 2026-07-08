/**
 * NetDiag — Dashboard de Triaje L1
 * Muestra contadores y la lista de equipos que requieren atención inmediata.
 */

let triajeCurrentPage = 1;
const TRIAJE_ITEMS_PER_PAGE = 10;

function triajeChangePage(dir) {
  triajeCurrentPage += dir;
  renderDashboard();
}

function renderDashboard() {
  const totalEl = document.getElementById('triajeTotal');
  const problemasEl = document.getElementById('triajeProblemas');
  const sanosEl = document.getElementById('triajeSanos');
  const table = document.getElementById('triajeCriticosTable');

  if (!totalEl || !problemasEl || !sanosEl || !table) return;

  const devices = allDevices || [];
  const total = devices.length;

  // Filtrar equipos con problemas (Pérdida > 2% o Latencia > 80ms o Quality mala)
  const criticos = devices.filter(d => 
    d.quality === 'poor' || 
    d.quality === 'critical' || 
    d.packetLoss > 2 || 
    d.latency > 80
  );

  const problemas = criticos.length;
  const sanos = total - problemas;

  totalEl.textContent = total;
  problemasEl.textContent = problemas;
  sanosEl.textContent = sanos;

  if (criticos.length === 0) {
    table.innerHTML = `<tr><td colspan="5" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" style="width:32px;height:32px;margin:0 auto 10px auto;display:block;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      No hay dispositivos críticos. La red se encuentra estable.
    </td></tr>`;
    return;
  }

  // Ordenar por severidad (Pérdida de paquetes primero, luego latencia)
  criticos.sort((a, b) => {
    if (b.packetLoss !== a.packetLoss) return b.packetLoss - a.packetLoss;
    return b.latency - a.latency;
  });

  // Paginación
  const totalPages = Math.ceil(criticos.length / TRIAJE_ITEMS_PER_PAGE) || 1;
  if (triajeCurrentPage > totalPages) triajeCurrentPage = totalPages;
  if (triajeCurrentPage < 1) triajeCurrentPage = 1;

  const startIndex = (triajeCurrentPage - 1) * TRIAJE_ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + TRIAJE_ITEMS_PER_PAGE, criticos.length);
  const pageItems = criticos.slice(startIndex, endIndex);

  // Update UI pagination controls
  const infoEl = document.getElementById('triajePaginationInfo');
  const btnPrev = document.getElementById('triajeBtnPrev');
  const btnNext = document.getElementById('triajeBtnNext');

  if (infoEl) infoEl.textContent = `Mostrando ${startIndex + 1}-${endIndex} de ${criticos.length}`;
  
  if (btnPrev) {
    btnPrev.disabled = triajeCurrentPage <= 1;
    btnPrev.style.opacity = btnPrev.disabled ? '0.3' : '1';
    btnPrev.style.cursor = btnPrev.disabled ? 'not-allowed' : 'pointer';
  }
  
  if (btnNext) {
    btnNext.disabled = triajeCurrentPage >= totalPages;
    btnNext.style.opacity = btnNext.disabled ? '0.3' : '1';
    btnNext.style.cursor = btnNext.disabled ? 'not-allowed' : 'pointer';
  }

  table.innerHTML = pageItems.map(d => {
    let problemaTxt = '';
    let iconColor = '';
    
    if (d.packetLoss >= 100) {
      problemaTxt = 'Desconectado / Pérdida Total';
      iconColor = 'var(--red)';
    } else if (d.packetLoss > 2) {
      problemaTxt = 'Pérdida de Paquetes';
      iconColor = 'var(--orange)';
    } else {
      problemaTxt = 'Alta Latencia';
      iconColor = 'var(--yellow)';
    }

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${iconColor}"></div>
            <div>
              <div class="mono" style="font-weight:600;color:var(--text-main)">${d.ip}</div>
              <div style="font-size:11px;color:var(--text-sec)">${d.hostname || 'Desconocido'}</div>
            </div>
          </div>
        </td>
        <td style="color:${iconColor}; font-weight:500;">${problemaTxt}</td>
        <td class="mono">${d.latency !== null ? d.latency.toFixed(1) + 'ms' : '—'}</td>
        <td class="mono">${d.packetLoss !== null ? d.packetLoss + '%' : '—'}</td>
        <td>
          <button class="btn" style="background:var(--bg-card);border:1px solid var(--border-color);color:var(--text-main);padding:4px 8px;font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer;" onclick="requestDiagnosticFor('${d.ip}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            Diagnosticar
          </button>
        </td>
      </tr>
    `;
  }).join('');
}
