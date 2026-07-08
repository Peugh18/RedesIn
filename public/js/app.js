/**
 * NetScope Pro — Punto de entrada principal de la aplicación
 * Inicializa todos los módulos cuando el DOM está listo
 */

// Utilidades (compartidas en todos los módulos)
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('es-MX', { hour12: false });
}

// Arranque
document.addEventListener('DOMContentLoaded', async () => {
  initClock();
  await loadAllViews();
  initSocket();
  loadInitialState();

});
