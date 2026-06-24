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
          <div class="schedule-item ${live ? 'schedule-item--live' : ''} ${finished ? 'schedule-item--clickable' : ''}" ${finished ? `onclick="openMatchModal(${m.id})"` : ''}>
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

// ─── Hero Card ────────────────────────────────────────────────────────────────
let countdownInterval = null;

function renderHero(liveMatches, allMatches) {
  const el = document.getElementById('hero');
  const now = new Date();

  // Priority: live match → next game today → next upcoming game
  let match = liveMatches[0];
  let mode = 'live';

  if (!match) {
    const next = allMatches
      .filter((m) => new Date(m.utcDate) > now && m.homeTeam?.name && m.awayTeam?.name)
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))[0];
    if (next) { match = next; mode = 'upcoming'; }
  }

  if (!match) { el.innerHTML = ''; return; }

  const h = match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? 0;
  const a = match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? 0;
  const matchDate = new Date(match.utcDate);
  const isLive = mode === 'live';
  const stage = match.stage ? match.stage.replace(/_/g, ' ') : 'Copa do Mundo 2026';

  el.innerHTML = `
    <div class="hero ${isLive ? 'hero--live' : 'hero--upcoming'}">
      <div class="hero__label">
        ${isLive ? `<span class="live-dot"></span> AO VIVO` : `Copa do Mundo 2026 · ${stage}`}
      </div>
      <div class="hero__body">
        <div class="hero__team">
          <img class="hero__crest" src="${match.homeTeam.crest}" alt="${match.homeTeam.tla}" onerror="this.style.display='none'" />
          <span class="hero__tla">${match.homeTeam.tla}</span>
          <span class="hero__name">${match.homeTeam.shortName || match.homeTeam.name}</span>
        </div>

        <div class="hero__center">
          ${isLive ? `
            <div class="hero__score">
              <span>${h}</span>
              <span class="hero__sep">:</span>
              <span>${a}</span>
            </div>
            <div class="hero__minute">${match.minute || '—'}'</div>
          ` : `
            <div class="hero__vs">VS</div>
            <div class="hero__time">${formatTime(match.utcDate)}</div>
            <div class="hero__countdown" id="heroCountdown"></div>
          `}
        </div>

        <div class="hero__team hero__team--away">
          <img class="hero__crest" src="${match.awayTeam.crest}" alt="${match.awayTeam.tla}" onerror="this.style.display='none'" />
          <span class="hero__tla">${match.awayTeam.tla}</span>
          <span class="hero__name">${match.awayTeam.shortName || match.awayTeam.name}</span>
        </div>
      </div>
      ${match.venue ? `<div class="hero__venue">📍 ${match.venue}</div>` : ''}
    </div>`;

  if (!isLive) {
    if (countdownInterval) clearInterval(countdownInterval);
    function tick() {
      const diff = matchDate - new Date();
      if (diff <= 0) { clearInterval(countdownInterval); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const el = document.getElementById('heroCountdown');
      if (el) el.textContent = `${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    }
    tick();
    countdownInterval = setInterval(tick, 1000);
  }
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

    const liveData = live.status === 'fulfilled' ? live.value : [];
    const allData  = allMatches.status === 'fulfilled' ? allMatches.value : [];

    renderHero(liveData, allData);
    renderLiveMatches(liveData);

    if (allMatches.status === 'fulfilled') {
      const matches = allData;
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

// ─── Match Detail Modal ───────────────────────────────────────────────────────
function closeModal(e) {
  if (e.target.id === 'matchModal') document.getElementById('matchModal').classList.remove('show');
}

async function openMatchModal(matchId) {
  const modal = document.getElementById('matchModal');
  const content = document.getElementById('modalContent');
  content.innerHTML = '<div class="modal-loading">Carregando...</div>';
  modal.classList.add('show');

  try {
    const m = await fetchAPI(`/api/matches/${matchId}`);
    const h = m.score?.fullTime?.home ?? 0;
    const a = m.score?.fullTime?.away ?? 0;
    const goals = m.goals || [];
    const bookings = m.bookings || [];
    const stage = m.stage ? m.stage.replace(/_/g, ' ') : 'Copa do Mundo 2026';

    // Build events timeline (goals + cards sorted by minute)
    const events = [
      ...goals.map((g) => ({ ...g, kind: 'goal' })),
      ...bookings.map((b) => ({ ...b, kind: 'card' })),
    ].sort((x, y) => (x.minute || 0) - (y.minute || 0));

    const homeGoals = goals.filter((g) => g.team?.id === m.homeTeam?.id);
    const awayGoals = goals.filter((g) => g.team?.id === m.awayTeam?.id);

    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-meta">${formatDateShort(m.utcDate)} · ${stage}</div>
        <div class="modal-teams">
          <div class="modal-team">
            <img class="modal-crest" src="${m.homeTeam.crest}" alt="${m.homeTeam.tla}" onerror="this.style.display='none'" />
            <span class="modal-tla">${m.homeTeam.tla}</span>
            <span class="modal-teamname">${m.homeTeam.shortName || m.homeTeam.name}</span>
            <div class="modal-scorers-list">
              ${homeGoals.map((g) => `<span>⚽ ${g.scorer?.name || 'Gol'} ${g.minute}'</span>`).join('')}
            </div>
          </div>
          <div class="modal-score">
            <span>${h}</span>
            <span class="modal-score-sep">:</span>
            <span>${a}</span>
          </div>
          <div class="modal-team modal-team--away">
            <img class="modal-crest" src="${m.awayTeam.crest}" alt="${m.awayTeam.tla}" onerror="this.style.display='none'" />
            <span class="modal-tla">${m.awayTeam.tla}</span>
            <span class="modal-teamname">${m.awayTeam.shortName || m.awayTeam.name}</span>
            <div class="modal-scorers-list">
              ${awayGoals.map((g) => `<span>⚽ ${g.scorer?.name || 'Gol'} ${g.minute}'</span>`).join('')}
            </div>
          </div>
        </div>
        ${m.venue ? `<div class="modal-venue">📍 ${m.venue}</div>` : ''}
      </div>

      <div class="modal-events">
        <div class="modal-events-title">Linha do Tempo</div>
        ${events.length === 0 ? '<div class="modal-empty">Nenhum evento registrado</div>' : ''}
        ${events.map((ev) => {
          const isHome = ev.team?.id === m.homeTeam?.id;
          if (ev.kind === 'goal') {
            return `
              <div class="modal-event ${isHome ? 'event--home' : 'event--away'}">
                <span class="event-minute">${ev.minute}'</span>
                <span class="event-icon">⚽</span>
                <div class="event-info">
                  <span class="event-player">${ev.scorer?.name || 'Gol'}</span>
                  ${ev.assist?.name ? `<span class="event-sub">Assistência: ${ev.assist.name}</span>` : ''}
                  ${ev.type === 'PENALTY' ? `<span class="event-sub">Pênalti</span>` : ''}
                  ${ev.type === 'OWN_GOAL' ? `<span class="event-sub">Gol contra</span>` : ''}
                </div>
                <span class="event-team">${ev.team?.shortName || ev.team?.name || ''}</span>
              </div>`;
          } else {
            const cardIcon = ev.card === 'RED_CARD' ? '🟥' : '🟨';
            return `
              <div class="modal-event ${isHome ? 'event--home' : 'event--away'}">
                <span class="event-minute">${ev.minute}'</span>
                <span class="event-icon">${cardIcon}</span>
                <div class="event-info">
                  <span class="event-player">${ev.player?.name || '—'}</span>
                </div>
                <span class="event-team">${ev.team?.shortName || ev.team?.name || ''}</span>
              </div>`;
          }
        }).join('')}
      </div>`;
  } catch (err) {
    content.innerHTML = `<div class="modal-empty">Erro ao carregar detalhes</div>`;
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
