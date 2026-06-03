/**
 * Etiquetas en español compartidas (calidad, fabricante, etc.)
 */
const CALIDAD_LABELS = {
  Excelente: 'Excelente',
  Buena: 'Buena',
  Regular: 'Regular',
  Critica: 'Crítica',
  Desconocida: 'Desconocida',
  Excellent: 'Excelente',
  Good: 'Buena',
  Poor: 'Regular',
  Critical: 'Crítica',
  Unknown: 'Desconocida',
};

function etiquetaCalidad(quality) {
  return CALIDAD_LABELS[quality] || quality || 'Desconocida';
}

function etiquetaFabricante(vendor) {
  if (!vendor || vendor === 'Unknown' || vendor === 'Desconocido') return '—';
  return vendor;
}
