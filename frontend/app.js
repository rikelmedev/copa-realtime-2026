const API_URL = 'https://copa-realtime-production.up.railway.app';
const WS_URL = window.location.hostname !== 'localhost'
  ? 'https://impartial-gratitude-production-3dfe.up.railway.app'
  : 'http://localhost:3001';

// ─── Utils ────────────────────────────────────────────────────────────────────
function formatDate(utcDate) {
  const d = new Date(utcDate);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
}

function formatDateShort(utcDate) {
  const d = new Date(utcDate);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

function formatTime(utcDate) {
  const d = new Date(utcDate);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

function isToday(utcDate) {
  const d = new Date(utcDate);
  const now = new Date();
  return d.toLocaleDateString('pt-BR') === now.toLocaleDateString('pt-BR');
}

function statusLabel(status, minute) {
  switch (status) {
    case 'IN_PLAY': return minute ? `${minute}'` : 'AO VIVO';
    case 'PAUSED':  return 'Intervalo';
    case 'FINISHED': return 'Encerrado';
    case 'SCHEDULED': return 'Programado';
    case 'TIMED': return 'Programado';
    default: return status;
  }
}

function crestImg(url, alt) {
  if (!url) return `<span class="crest-placeholder">${(alt || '?').slice(0,3)}</span>`;
  return `<img class="crest" src="${url}" alt="${alt}" onerror="this.outerHTML='<span class=crest-placeholder>${(alt||'?').slice(0,3)}</span>'" />`;
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
async function fetchAPI(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Live Matches ─────────────────────────────────────────────────────────────
function renderLiveMatches(matches) {
  const el = document.getElementById('liveMatches');
  const count = document.getElementById('liveCount');

  if (!matches.length) {
    el.innerHTML = '<div class="empty-state">Nenhum jogo ao vivo no momento</div>';
    count.textContent = '';
    document.getElementById('section-live').style.display = 'none';
    return;
  }

  document.getElementById('section-live').style.display = '';
  count.textContent = `${matches.length} ao vivo`;

  el.innerHTML = matches.map((m) => {
    const h = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? 0;
    const a = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? 0;
    const min = m.minute || '';
    return `
      <div class="match-card match-card--live" data-id="${m.id}">
        <div class="match-card__header">
          <span class="match-card__status--live"><span class="live-dot"></span> ${statusLabel(m.status, min)}</span>
          <span class="match-card__venue">${m.venue || ''}</span>
        </div>
        <div class="match-card__body">
          <div class="match-card__team">
            ${crestImg(m.homeTeam.crest, m.homeTeam.tla)}
            <span class="match-card__tla">${m.homeTeam.tla}</span>
            <span class="match-card__fullname">${m.homeTeam.shortName || m.homeTeam.name}</span>
          </div>
          <div class="match-card__scorebox">
            <span class="match-card__score" id="sh-${m.id}">${h}</span>
            <span class="match-card__sep">:</span>
            <span class="match-card__score" id="sa-${m.id}">${a}</span>
          </div>
          <div class="match-card__team match-card__team--away">
            <span class="match-card__fullname">${m.awayTeam.shortName || m.awayTeam.name}</span>
            <span class="match-card__tla">${m.awayTeam.tla}</span>
            ${crestImg(m.awayTeam.crest, m.awayTeam.tla)}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
function renderSchedule(matches, containerId) {
  const el = document.getElementById(containerId);

  if (!matches.length) {
    el.innerHTML = '<div class="empty-state">Nenhum jogo encontrado</div>';
    return;
  }

  const grouped = {};
  matches.forEach((m) => {
    const key = formatDate(m.utcDate);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  el.innerHTML = Object.entries(grouped).map(([date, games]) => `
    <div class="schedule-group">
      <div class="schedule-group__date">${date}</div>
      ${games.map((m) => {
        const finished = m.status === 'FINISHED';
        const live = m.status === 'IN_PLAY' || m.status === 'PAUSED';
        const h = m.score?.fullTime?.home ?? m.score?.halfTime?.home;
        const a = m.score?.fullTime?.away ?? m.score?.halfTime?.away;
        const hasScore = h !== null && h !== undefined;
        const statusCls = finished ? 'status--finished' : live ? 'status--live' : 'status--scheduled';
        return `
          <div class="schedule-item ${live ? 'schedule-item--live' : ''}">
            <div class="schedule-item__time">${live ? `<span class="live-dot"></span>` : ''}${formatTime(m.utcDate)}</div>
            <div class="schedule-item__teams">
              <div class="schedule-item__team">
                ${crestImg(m.homeTeam.crest, m.homeTeam.tla)}
                <span>${m.homeTeam.shortName || m.homeTeam.name}</span>
              </div>
              <div class="schedule-item__score ${hasScore ? 'has-score' : ''}">
                ${hasScore ? `<b>${h}</b><span>:</span><b>${a}</b>` : '<span class="vs">VS</span>'}
              </div>
              <div class="schedule-item__team schedule-item__team--away">
                <span>${m.awayTeam.shortName || m.awayTeam.name}</span>
                ${crestImg(m.awayTeam.crest, m.awayTeam.tla)}
              </div>
            </div>
            <div class="schedule-item__status ${statusCls}">${statusLabel(m.status, m.minute)}</div>
          </div>`;
      }).join('')}
    </div>`).join('');
}

// ─── Standings ────────────────────────────────────────────────────────────────
function renderStandings(standings) {
  const el = document.getElementById('standings');

  if (!standings.length) {
    el.innerHTML = '<div class="empty-state">Classificação não disponível</div>';
    return;
  }

  el.innerHTML = standings.map((group) => {
    const title = group.group
      ? `Grupo ${group.group.replace('GROUP_', '')}`
      : group.stage || 'Classificação';
    return `
      <div class="standings-group">
        <div class="standings-group__title">${title}</div>
        <table class="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th class="th-team">Time</th>
              <th title="Jogos">J</th>
              <th title="Vitórias">V</th>
              <th title="Empates">E</th>
              <th title="Derrotas">D</th>
              <th title="Gols Pró">GP</th>
              <th title="Gols Contra">GC</th>
              <th title="Saldo de Gols">SG</th>
              <th title="Pontos">Pts</th>
            </tr>
          </thead>
          <tbody>
            ${group.table.map((row) => `
              <tr class="${row.position <= 2 ? 'tr--qualified' : ''}">
                <td class="td-pos">${row.position}</td>
                <td class="td-team">
                  ${crestImg(row.team.crest, row.team.tla)}
                  <span class="td-tla">${row.team.tla}</span>
                  <span class="td-name">${row.team.shortName || row.team.name}</span>
                </td>
                <td>${row.playedGames}</td>
                <td>${row.won}</td>
                <td>${row.draw}</td>
                <td>${row.lost}</td>
                <td>${row.goalsFor}</td>
                <td>${row.goalsAgainst}</td>
                <td class="${row.goalDifference > 0 ? 'td-pos' : row.goalDifference < 0 ? 'td-neg' : ''}">
                  ${row.goalDifference > 0 ? '+' : ''}${row.goalDifference}
                </td>
                <td class="td-pts">${row.points}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }).join('');
}

// ─── Scorers ──────────────────────────────────────────────────────────────────
function renderScorers(scorers) {
  const el = document.getElementById('scorers');

  if (!scorers.length) {
    el.innerHTML = '<div class="empty-state">Artilheiros não disponíveis ainda</div>';
    return;
  }

  el.innerHTML = `
    <div class="scorers-table">
      <div class="scorers-head">
        <span>#</span>
        <span class="sh-player">Jogador</span>
        <span class="sh-team">Seleção</span>
        <span title="Gols">⚽</span>
        <span title="Assistências">🅰️</span>
        <span title="Pênaltis">P</span>
      </div>
      ${scorers.map((s, i) => `
        <div class="scorer-row ${i < 3 ? 'scorer-row--top' : ''}">
          <span class="scorer-rank ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : ''}">${i + 1}</span>
          <div class="scorer-player">
            <span class="scorer-name">${s.player.name}</span>
            <span class="scorer-nat">${s.player.nationality || ''}</span>
          </div>
          <div class="scorer-team">
            ${crestImg(s.team.crest, s.team.tla)}
            <span>${s.team.tla || s.team.name}</span>
          </div>
          <span class="scorer-goals">${s.goals ?? s.numberOfGoals ?? 0}</span>
          <span class="scorer-assists">${s.assists ?? '—'}</span>
          <span class="scorer-pen">${s.penalties ?? '—'}</span>
        </div>`).join('')}
    </div>`;
}

// ─── Load All Data ────────────────────────────────────────────────────────────
async function loadAll() {
  try {
    const [live, allMatches, standings, scorers] = await Promise.allSettled([
      fetchAPI('/api/live'),
      fetchAPI('/api/matches'),
      fetchAPI('/api/standings'),
      fetchAPI('/api/scorers'),
    ]);

    if (live.status === 'fulfilled') renderLiveMatches(live.value);

    if (allMatches.status === 'fulfilled') {
      const matches = allMatches.value;
      const now = new Date();

      const todayGames = matches.filter((m) => isToday(m.utcDate));
      const upcoming = matches
        .filter((m) => new Date(m.utcDate) > now && !isToday(m.utcDate) && m.homeTeam?.name && m.awayTeam?.name)
        .slice(0, 40);
      const recent = matches
        .filter((m) => m.status === 'FINISHED')
        .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
        .slice(0, 20);

      renderSchedule(todayGames, 'todayMatches');
      renderSchedule(upcoming, 'upcomingMatches');
      renderSchedule(recent, 'recentMatches');

      document.getElementById('section-today').style.display = todayGames.length ? '' : 'none';
    }

    if (standings.status === 'fulfilled') renderStandings(standings.value);
    if (scorers.status === 'fulfilled')  renderScorers(scorers.value);

  } catch (err) {
    console.error('Erro ao carregar dados:', err);
  }
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ─── WebSocket ────────────────────────────────────────────────────────────────
const socket = io(WS_URL);

socket.on('connect', () => {
  document.getElementById('connDot').className = 'connection-status__dot online';
  document.getElementById('connectionLabel').textContent = 'Ao vivo';
});

socket.on('disconnect', () => {
  document.getElementById('connDot').className = 'connection-status__dot offline';
  document.getElementById('connectionLabel').textContent = 'Desconectado';
});

socket.on('atualizacao', (event) => {
  if (event.type === 'GOL') {
    const overlay = document.getElementById('golOverlay');
    document.getElementById('golOverlaySub').textContent = event.data?.team || '';
    overlay.classList.add('show');
    setTimeout(() => overlay.classList.remove('show'), 3000);
    fetchAPI('/api/live').then(renderLiveMatches).catch(() => {});
  }
  loadAll();
});

// ─── Init ─────────────────────────────────────────────────────────────────────
loadAll();
setInterval(loadAll, 60000);
