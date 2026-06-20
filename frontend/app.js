const socket = io('http://localhost:3001');

const statusEl = document.getElementById('status');
const golsA = document.getElementById('golsA');
const golsB = document.getElementById('golsB');
const feed = document.getElementById('feed');

const stats = {
  golsA: 0,
  golsB: 0,
  posseA: 50,
  posseB: 50,
  chutesA: 0,
  chutesB: 0,
  amarelosA: 0,
  amarelosB: 0,
  vermelhosA: 0,
  vermelhosB: 0,
};

// Charts
const chartPosse = new Chart(document.getElementById('chartPosse'), {
  type: 'doughnut',
  data: {
    labels: ['Time A', 'Time B'],
    datasets: [{ data: [50, 50], backgroundColor: ['#1a73e8', '#e84c1a'] }],
  },
  options: { plugins: { legend: { position: 'bottom' } } },
});

const chartChutes = new Chart(document.getElementById('chartChutes'), {
  type: 'bar',
  data: {
    labels: ['Time A', 'Time B'],
    datasets: [{ label: 'Chutes', data: [0, 0], backgroundColor: ['#1a73e8', '#e84c1a'] }],
  },
  options: { scales: { y: { beginAtZero: true } } },
});

const chartCartoes = new Chart(document.getElementById('chartCartoes'), {
  type: 'bar',
  data: {
    labels: ['Amarelos A', 'Amarelos B', 'Vermelhos A', 'Vermelhos B'],
    datasets: [{ label: 'Cartões', data: [0, 0, 0, 0], backgroundColor: ['#f9c74f', '#f9c74f', '#e84c1a', '#e84c1a'] }],
  },
  options: { scales: { y: { beginAtZero: true } } },
});

function updateCharts() {
  chartPosse.data.datasets[0].data = [stats.posseA, stats.posseB];
  chartPosse.update();

  chartChutes.data.datasets[0].data = [stats.chutesA, stats.chutesB];
  chartChutes.update();

  chartCartoes.data.datasets[0].data = [stats.amarelosA, stats.amarelosB, stats.vermelhosA, stats.vermelhosB];
  chartCartoes.update();
}

function addFeedItem(event) {
  const p = document.createElement('p');
  const hora = new Date(event.timestamp).toLocaleTimeString('pt-BR');
  const icons = { GOL: '⚽', CARTAO_AMARELO: '🟨', CARTAO_VERMELHO: '🟥', CHUTE: '🎯', POSSE: '📊' };
  const icon = icons[event.type] || '📌';
  p.textContent = `${hora} — ${icon} ${event.type} | Partida ${event.matchId}`;
  feed.querySelector('.feed-placeholder')?.remove();
  feed.prepend(p);
}

socket.on('connect', () => {
  statusEl.textContent = 'Conectado';
  statusEl.className = 'status online';
});

socket.on('disconnect', () => {
  statusEl.textContent = 'Desconectado';
  statusEl.className = 'status offline';
});

socket.on('atualizacao', (event) => {
  addFeedItem(event);

  switch (event.type) {
    case 'GOL':
      if (event.data.time === 'A') stats.golsA++;
      else stats.golsB++;
      golsA.textContent = stats.golsA;
      golsB.textContent = stats.golsB;
      break;
    case 'POSSE':
      stats.posseA = event.data.timeA;
      stats.posseB = event.data.timeB;
      break;
    case 'CHUTE':
      if (event.data.time === 'A') stats.chutesA++;
      else stats.chutesB++;
      break;
    case 'CARTAO_AMARELO':
      if (event.data.time === 'A') stats.amarelosA++;
      else stats.amarelosB++;
      break;
    case 'CARTAO_VERMELHO':
      if (event.data.time === 'A') stats.vermelhosA++;
      else stats.vermelhosB++;
      break;
  }

  updateCharts();
});
