/**
 * NetScope Pro — Módulo de Tráfico
 * Gráfico de tráfico en tiempo real simulado
 */

let trafficChart = null;
const MAX_DATA_POINTS = 30;
let dlData = Array(MAX_DATA_POINTS).fill(0);
let ulData = Array(MAX_DATA_POINTS).fill(0);
let trafficLabels = Array(MAX_DATA_POINTS).fill('');

function initTrafficChart() {
  const canvas = document.getElementById('trafficChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const dlGradient = ctx.createLinearGradient(0, 0, 0, 400);
  dlGradient.addColorStop(0, 'rgba(253, 186, 48, 0.4)');
  dlGradient.addColorStop(1, 'rgba(253, 186, 48, 0)');

  trafficChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trafficLabels,
      datasets: [
        {
          label: 'Download (Mbps)',
          data: dlData,
          borderColor: '#fdba30',
          backgroundColor: dlGradient,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0
        },
        {
          label: 'Upload (Mbps)',
          data: ulData,
          borderColor: '#d99c22',
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          borderWidth: 1,
          pointRadius: 0
        }
      ]
    },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#666', font: { size: 10 } }
          },
          x: { display: false }
        },
        animation: { duration: 0 }
      }
    });
  }

  function updateTrafficDataReal(download, upload) {
    if (!trafficChart) return;

    const dlEl = document.getElementById('dl-speed');
    const ulEl = document.getElementById('ul-speed');
    if (dlEl) dlEl.textContent = `${(download !== null && download !== undefined) ? download.toFixed(2) : '0.00'} Mbps`;
    if (ulEl) ulEl.textContent = `${(upload !== null && upload !== undefined) ? upload.toFixed(2) : '0.00'} Mbps`;

    dlData.push(download);
    ulData.push(upload);

    if (dlData.length > MAX_DATA_POINTS) {
      dlData.shift();
      ulData.shift();
    }

    trafficChart.update();
  }
