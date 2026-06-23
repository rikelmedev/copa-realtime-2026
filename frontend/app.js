const TEAMS = {
  BRA: { name: 'Brasil',     code: 'BRA', flag: '🇧🇷', color: '#009C3B' },
  ARG: { name: 'Argentina',  code: 'ARG', flag: '🇦🇷', color: '#74ACDF' },
  FRA: { name: 'França',     code: 'FRA', flag: '🇫🇷', color: '#002395' },
  ALE: { name: 'Alemanha',   code: 'ALE', flag: '🇩🇪', color: '#DD0000' },
  ENG: { name: 'Inglaterra', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#CF081F' },
  ESP: { name: 'Espanha',    code: 'ESP', flag: '🇪🇸', color: '#AA151B' },
  POR: { name: 'Portugal',   code: 'POR', flag: '🇵🇹', color: '#006600' },
  ITA: { name: 'Itália',     code: 'ITA', flag: '🇮🇹', color: '#003087' },
  NED: { name: 'Holanda',    code: 'NED', flag: '🇳🇱', color: '#FF6600' },
  BEL: { name: 'Bélgica',    code: 'BEL', flag: '🇧🇪', color: '#EF0000' },
  CRO: { name: 'Croácia',    code: 'CRO', flag: '🇭🇷', color: '#FF0000' },
  URU: { name: 'Uruguai',    code: 'URU', flag: '🇺🇾', color: '#5BA4CF' },
  MEX: { name: 'México',     code: 'MEX', flag: '🇲🇽', color: '#006847' },
  USA: { name: 'EUA',        code: 'USA', flag: '🇺🇸', color: '#002868' },
  JPN: { name: 'Japão',      code: 'JPN', flag: '🇯🇵', color: '#BC002D' },
  SEN: { name: 'Senegal',    code: 'SEN', flag: '🇸🇳', color: '#00853F' },
  MAR: { name: 'Marrocos',   code: 'MAR', flag: '🇲🇦', color: '#C1272D' },
  AUS: { name: 'Austrália',  code: 'AUS', flag: '🇦🇺', color: '#FFCD00' },
  SUI: { name: 'Suíça',      code: 'SUI', flag: '🇨🇭', color: '#FF0000' },
  COL: { name: 'Colômbia',   code: 'COL', flag: '🇨🇴', color: '#FCD116' },
};

const EVENT_ICONS = {
  GOL:            '⚽',
  CARTAO_AMARELO: '🟨',
  CARTAO_VERMELHO:'🟥',
  CHUTE:          '🎯',
  POSSE:          '📊',
  FALTA:          '🦵',
  MATCH_START:    '🏁',
  DEFAULT:        '📌',
};

const EVENT_LABELS = {
  GOL:            'Gol',
  CARTAO_AMARELO: 'Cartão Amarelo',
  CARTAO_VERMELHO:'Cartão Vermelho',
  CHUTE:          'Finalização',
  POSSE:          'Posse de Bola',
  FALTA:          'Falta',
  MATCH_START:    'Início de Partida',
};

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  teamA: TEAMS.BRA,
  teamB: TEAMS.ARG,
  scoreA: 0,
  scoreB: 0,
  minute: 0,
  posseA: 50,
  posseB: 50,
  chutesA: 0, chutesB: 0,
  noGolA: 0,  noGolB: 0,
  amarelosA: 0, amarelosB: 0,
  vermelhosA: 0, vermelhosB: 0,
  faltasA: 0, faltasB: 0,
  eventCount: 0,
  scorersA: [],
  scorersB: [],
  posseTempo: [],
  chutesPeriodo: { p1A: 0, p1B: 0, p2A: 0, p2B: 0 },
  eventosDistrib: {},
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// ─── Team colors ──────────────────────────────────────────────────────────────
function applyTeamColors(teamA, teamB) {
  const root = document.documentElement;
  root.style.setProperty('--color-team-a', teamA.color);
  root.style.setProperty('--color-team-b', teamB.color);
}

function renderTeams() {
  const a = state.teamA;
  const b = state.teamB;
  applyTeamColors(a, b);

  $('flagA').textContent = a.flag;
  $('codeA').textContent = a.code;
  $('nameA').textContent = a.name;
  $('flagB').textContent = b.flag;
  $('codeB').textContent = b.code;
  $('nameB').textContent = b.name;
  $('flagCardA').textContent = a.flag;
  $('flagCardB').textContent = b.flag;
}

// ─── Score ────────────────────────────────────────────────────────────────────
function flashScore(side) {
  const el = $(side === 'A' ? 'scoreA' : 'scoreB');
  el.classList.remove('gol-flash');
  void el.offsetWidth;
  el.classList.add('gol-flash');
  setTimeout(() => el.classList.remove('gol-flash'), 600);
}

function updateScore() {
  $('scoreA').textContent = state.scoreA;
  $('scoreB').textContent = state.scoreB;

  $('scorersA').innerHTML = state.scorersA.slice(-3).map(
    (s) => `<span>⚽ ${s.player || 'Gol'} ${s.minute}'</span>`
  ).join('');
  $('scorersB').innerHTML = state.scorersB.slice(-3).map(
    (s) => `<span>⚽ ${s.player || 'Gol'} ${s.minute}'</span>`
  ).join('');
}

// ─── Gol overlay ─────────────────────────────────────────────────────────────
function showGolOverlay(team) {
  let overlay = document.querySelector('.gol-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'gol-overlay';
    overlay.innerHTML = `
      <div class="gol-overlay__content">
        <div class="gol-overlay__text">GOL!</div>
        <div class="gol-overlay__sub" id="golOverlaySub"></div>
      </div>`;
    document.body.appendChild(overlay);
  }
  $('golOverlaySub').textContent = team ? `${team.flag} ${team.name}` : '';
  overlay.classList.remove('show');
  void overlay.offsetWidth;
  overlay.classList.add('show');
  setTimeout(() => overlay.classList.remove('show'), 2600);
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function updateStats() {
  // Posse
  $('posseA').textContent = `${state.posseA}%`;
  $('posseB').textContent = `${state.posseB}%`;
  $('posseBarA').style.width = `${state.posseA}%`;
  $('posseBarB').style.width = `${state.posseB}%`;

  // Chutes
  const maxC = Math.max(state.chutesA, state.chutesB, 1);
  $('chutesA').textContent = state.chutesA;
  $('chutesB').textContent = state.chutesB;
  $('chuteBarA').style.width = `${(state.chutesA / maxC) * 100}%`;
  $('chuteBarB').style.width = `${(state.chutesB / maxC) * 100}%`;

  // No gol
  const maxN = Math.max(state.noGolA, state.noGolB, 1);
  $('noGolA').textContent = state.noGolA;
  $('noGolB').textContent = state.noGolB;
  $('noGolBarA').style.width = `${(state.noGolA / maxN) * 100}%`;
  $('noGolBarB').style.width = `${(state.noGolB / maxN) * 100}%`;

  // Cartões
  $('amarelosA').textContent = `${state.amarelosA} 🟨`;
  $('amarelosB').textContent = `🟨 ${state.amarelosB}`;
  $('vermelhosA').textContent = `${state.vermelhosA} 🟥`;
  $('vermelhosB').textContent = `🟥 ${state.vermelhosB}`;

  // Faltas
  const maxF = Math.max(state.faltasA, state.faltasB, 1);
  $('faltasA').textContent = state.faltasA;
  $('faltasB').textContent = state.faltasB;
  $('faltaBarA').style.width = `${(state.faltasA / maxF) * 100}%`;
  $('faltaBarB').style.width = `${(state.faltasB / maxF) * 100}%`;
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function updateTimeline(minute) {
  const pct = Math.min((minute / 90) * 100, 100);
  $('timelineProgress').style.width = `${pct}%`;
  $('matchMinute').textContent = `${minute}'`;
}

function addTimelineEvent(type, minute, side) {
  const icon = EVENT_ICONS[type] || EVENT_ICONS.DEFAULT;
  const pct = Math.min((minute / 90) * 100, 100);
  const team = side === 'A' ? state.teamA : state.teamB;

  const el = document.createElement('div');
  el.className = 'timeline__event';
  el.style.left = `${pct}%`;
  el.innerHTML = `
    <div class="timeline__event-icon">${icon}</div>
    <div class="timeline__event-tooltip">${minute}' · ${EVENT_LABELS[type] || type}${team ? ` · ${team.flag}` : ''}</div>
  `;
  $('timelineEvents').appendChild(el);
}

// ─── Feed ─────────────────────────────────────────────────────────────────────
function addFeedCard(event) {
  const feed = $('feed');
  feed.querySelector('.feed__empty')?.remove();

  state.eventCount++;
  $('eventCount').textContent = `${state.eventCount} evento${state.eventCount > 1 ? 's' : ''}`;

  const type = event.type;
  const minute = event.data?.minute || state.minute;
  const side = event.data?.time || 'A';
  const team = side === 'A' ? state.teamA : state.teamB;
  const icon = EVENT_ICONS[type] || EVENT_ICONS.DEFAULT;
  const label = EVENT_LABELS[type] || type;
  const teamClass = side === 'B' ? 'feed-card__team-badge--b' : '';

  let title = label;
  let sub = '';

  if (type === 'GOL') {
    title = `Gol de ${team.name}!`;
    sub = event.data?.player ? `Assistência: ${event.data.assist || '—'}` : '';
  } else if (type === 'CARTAO_AMARELO' || type === 'CARTAO_VERMELHO') {
    title = `${label} — ${team.name}`;
    sub = event.data?.player || '';
  } else if (type === 'POSSE') {
    title = `Posse: ${event.data?.timeA || 50}% × ${event.data?.timeB || 50}%`;
  } else if (type === 'MATCH_START') {
    title = `Partida iniciada: ${state.teamA.flag} ${state.teamA.code} × ${state.teamB.code} ${state.teamB.flag}`;
  }

  const card = document.createElement('div');
  card.className = `feed-card feed-card--${type.toLowerCase().replace('_', '-')}`;
  card.innerHTML = `
    <div class="feed-card__minute">${minute}'</div>
    <div class="feed-card__content">
      <div class="feed-card__type">
        <span class="feed-card__type-icon">${icon}</span>
        ${label}
      </div>
      <div class="feed-card__title">${title}</div>
      ${sub ? `<div class="feed-card__sub">${sub}</div>` : ''}
      <span class="feed-card__team-badge ${teamClass}">${team.flag} ${team.code}</span>
    </div>
  `;

  feed.prepend(card);
}

// ─── Charts ──────────────────────────────────────────────────────────────────
const chartDefaults = {
  color: '#8B96B0',
  borderColor: '#1E2535',
};

Chart.defaults.color = chartDefaults.color;
Chart.defaults.borderColor = chartDefaults.borderColor;

const chartPosseTempo = new Chart($('chartPosseTempo'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: 'Time A', data: [], borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-team-a').trim() || '#009C3B', tension: 0.4, fill: false, pointRadius: 3 },
      { label: 'Time B', data: [], borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-team-b').trim() || '#74ACDF', tension: 0.4, fill: false, pointRadius: 3 },
    ],
  },
  options: {
    responsive: true,
    plugins: { legend: { position: 'bottom' } },
    scales: {
      y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` }, grid: { color: '#1E2535' } },
      x: { grid: { color: '#1E2535' } },
    },
  },
});

const chartChutes = new Chart($('chartChutes'), {
  type: 'bar',
  data: {
    labels: ['1º Tempo A', '1º Tempo B', '2º Tempo A', '2º Tempo B'],
    datasets: [{
      label: 'Chutes',
      data: [0, 0, 0, 0],
      backgroundColor: ['#009C3B99', '#74ACDF99', '#009C3B', '#74ACDF'],
      borderRadius: 4,
    }],
  },
  options: {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: '#1E2535' } },
      x: { grid: { color: '#1E2535' } },
    },
  },
});

const chartEventos = new Chart($('chartEventos'), {
  type: 'doughnut',
  data: {
    labels: ['Gols', 'Cartões', 'Chutes', 'Faltas'],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#FFD700', '#F59E0B', '#009C3B', '#74ACDF'],
      borderWidth: 0,
    }],
  },
  options: {
    responsive: true,
    plugins: { legend: { position: 'bottom' } },
    cutout: '65%',
  },
});

function updateCharts() {
  // Posse ao longo do tempo
  if (state.minute > 0 && state.minute % 5 === 0) {
    chartPosseTempo.data.labels.push(`${state.minute}'`);
    chartPosseTempo.data.datasets[0].data.push(state.posseA);
    chartPosseTempo.data.datasets[1].data.push(state.posseB);
    chartPosseTempo.update('none');
  }

  // Chutes por período
  chartChutes.data.datasets[0].data = [
    state.chutesPeriodo.p1A, state.chutesPeriodo.p1B,
    state.chutesPeriodo.p2A, state.chutesPeriodo.p2B,
  ];
  chartChutes.update('none');

  // Distribuição de eventos
  const gols    = (state.scorersA.length + state.scorersB.length);
  const cartoes = (state.amarelosA + state.amarelosB + state.vermelhosA + state.vermelhosB);
  const chutes  = (state.chutesA + state.chutesB);
  const faltas  = (state.faltasA + state.faltasB);
  chartEventos.data.datasets[0].data = [gols, cartoes, chutes, faltas];
  chartEventos.update('none');
}

// ─── Socket events ────────────────────────────────────────────────────────────
const WS_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? 'https://impartial-gratitude-production-3dfe.up.railway.app'
  : 'http://localhost:3001';

const socket = io(WS_URL);

socket.on('connect', () => {
  const dot = document.querySelector('.connection-status__dot');
  dot.className = 'connection-status__dot online';
  $('connectionLabel').textContent = 'Ao vivo';
});

socket.on('disconnect', () => {
  const dot = document.querySelector('.connection-status__dot');
  dot.className = 'connection-status__dot offline';
  $('connectionLabel').textContent = 'Desconectado';
});

socket.on('atualizacao', (event) => {
  const { type, data, matchId } = event;
  const minute = data?.minute || state.minute;
  state.minute = minute;

  updateTimeline(minute);
  addFeedCard(event);
  addTimelineEvent(type, minute, data?.time || 'A');

  switch (type) {
    case 'MATCH_START':
      if (data?.teamA) state.teamA = TEAMS[data.teamA] || state.teamA;
      if (data?.teamB) state.teamB = TEAMS[data.teamB] || state.teamB;
      renderTeams();
      $('matchVenue').textContent = data?.venue || 'A definir';
      break;

    case 'GOL':
      if (data.time === 'A') {
        state.scoreA++;
        state.scorersA.push({ player: data.player, minute });
        flashScore('A');
        showGolOverlay(state.teamA);
      } else {
        state.scoreB++;
        state.scorersB.push({ player: data.player, minute });
        flashScore('B');
        showGolOverlay(state.teamB);
      }
      updateScore();
      break;

    case 'POSSE':
      state.posseA = data.timeA ?? 50;
      state.posseB = data.timeB ?? 50;
      break;

    case 'CHUTE':
      if (data.time === 'A') {
        state.chutesA++;
        if (minute <= 45) state.chutesPeriodo.p1A++; else state.chutesPeriodo.p2A++;
      } else {
        state.chutesB++;
        if (minute <= 45) state.chutesPeriodo.p1B++; else state.chutesPeriodo.p2B++;
      }
      break;

    case 'CHUTE_NO_GOL':
      if (data.time === 'A') state.noGolA++; else state.noGolB++;
      break;

    case 'CARTAO_AMARELO':
      if (data.time === 'A') state.amarelosA++; else state.amarelosB++;
      break;

    case 'CARTAO_VERMELHO':
      if (data.time === 'A') state.vermelhosA++; else state.vermelhosB++;
      break;

    case 'FALTA':
      if (data.time === 'A') state.faltasA++; else state.faltasB++;
      break;
  }

  updateStats();
  updateCharts();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
(function init() {
  renderTeams();
  updateScore();
  updateStats();

  $('matchDate').textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
})();
