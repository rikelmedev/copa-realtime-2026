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
      <div class="match-card match-card--live schedule-item--clickable" data-id="${m.id}" onclick="openMatchModal(${m.id})">
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
        const groupLabel = m.group ? `Grupo ${m.group.replace('GROUP_', '')}` : (m.stage === 'ROUND_OF_16' ? 'Oitavas' : m.stage === 'QUARTER_FINALS' ? 'Quartas' : m.stage === 'SEMI_FINALS' ? 'Semi' : m.stage === 'FINAL' ? 'Final' : '');
        return `
          <div class="schedule-item ${live ? 'schedule-item--live' : ''} ${finished || live ? 'schedule-item--clickable' : ''}" ${finished || live ? `onclick="openMatchModal(${m.id})"` : ''}>
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
            <div class="schedule-item__right">
              ${groupLabel ? `<span class="schedule-item__group">${groupLabel}</span>` : ''}
              <span class="schedule-item__status ${statusCls}">${statusLabel(m.status, m.minute)}</span>
            </div>
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
      ? `Grupo ${group.group.split(/[_\s]/).pop()}`
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
            ${group.table.map((row) => {
                const zoneCls = row.position <= 2 ? 'tr--qualified' : row.position === 3 ? 'tr--maybe' : 'tr--eliminated';
                return `
              <tr class="${zoneCls}">
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
              </tr>`;
              }).join('')}
          </tbody>
        </table>
        <div class="standings-legend">
          <div class="standings-legend__item"><div class="standings-legend__dot" style="background:#22C55E"></div>Classificado às oitavas</div>
          <div class="standings-legend__item"><div class="standings-legend__dot" style="background:#C8A432"></div>Possível classificação (melhor 3º)</div>
          <div class="standings-legend__item"><div class="standings-legend__dot" style="background:#EF4444"></div>Eliminado</div>
        </div>
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

// ─── Stats Bar ───────────────────────────────────────────────────────────────
function renderStats(allData) {
  const el = document.getElementById('statsBar');
  if (!el || !allData.length) return;

  const finished = allData.filter((m) => m.status === 'FINISHED');
  const played = finished.length;
  const goals = finished.reduce((sum, m) => {
    return sum + (m.score?.fullTime?.home ?? 0) + (m.score?.fullTime?.away ?? 0);
  }, 0);
  const avg = played ? (goals / played).toFixed(1) : '—';
  const teams = new Set();
  allData.forEach((m) => {
    if (m.homeTeam?.name) teams.add(m.homeTeam.name);
    if (m.awayTeam?.name) teams.add(m.awayTeam.name);
  });

  el.innerHTML = `
    <div class="stats-bar__item"><span class="stats-bar__num">${played}</span><span class="stats-bar__lbl">Partidas</span></div>
    <div class="stats-bar__item"><span class="stats-bar__num">${goals}</span><span class="stats-bar__lbl">Gols</span></div>
    <div class="stats-bar__item"><span class="stats-bar__num">${avg}</span><span class="stats-bar__lbl">Média/jogo</span></div>
    <div class="stats-bar__item"><span class="stats-bar__num">${teams.size}</span><span class="stats-bar__lbl">Seleções</span></div>
  `;
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
      <div class="hero__banner">
        ${isLive
          ? `<span class="live-dot"></span>&nbsp; AO VIVO · Copa do Mundo FIFA 2026`
          : `Copa do Mundo FIFA 2026 · ${stage}`}
      </div>
      <div class="hero__inner">
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
              ${match.minute ? `<div class="hero__minute">${match.minute}'</div>` : ''}
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

// ─── Cache (modal + last good data para rate limit) ──────────────────────────
let matchCache = {};
let lastGoodData = { live: [], matches: [], standings: [], scorers: [] };

// ─── Load All Data ────────────────────────────────────────────────────────────
async function loadAll() {
  try {
    const [live, allMatches, standings, scorers] = await Promise.allSettled([
      fetchAPI('/api/live'),
      fetchAPI('/api/matches'),
      fetchAPI('/api/standings'),
      fetchAPI('/api/scorers'),
    ]);

    // Use new data if valid, otherwise fall back to last good data
    const liveData     = live.status === 'fulfilled'       && live.value.length        ? live.value       : lastGoodData.live;
    const allData      = allMatches.status === 'fulfilled' && allMatches.value.length  ? allMatches.value : lastGoodData.matches;
    const standingsVal = standings.status === 'fulfilled'  && standings.value.length   ? standings.value  : lastGoodData.standings;
    const scorersVal   = scorers.status === 'fulfilled'    && scorers.value.length     ? scorers.value    : lastGoodData.scorers;

    // Update last good data only when we receive valid responses
    if (live.status === 'fulfilled')       lastGoodData.live      = live.value;
    if (allMatches.status === 'fulfilled' && allMatches.value.length) lastGoodData.matches   = allMatches.value;
    if (standings.status === 'fulfilled'  && standings.value.length)  lastGoodData.standings = standings.value;
    if (scorers.status === 'fulfilled'    && scorers.value.length)     lastGoodData.scorers   = scorers.value;

    // Cache matches for modal use
    allData.forEach((m) => { matchCache[m.id] = m; });
    liveData.forEach((m) => { matchCache[m.id] = m; });

    renderHero(liveData, allData);
    renderStats(allData);
    renderLiveMatches(liveData);

    const now = new Date();
    const todayGames = allData.filter((m) => isToday(m.utcDate));
    const upcoming = allData
      .filter((m) => new Date(m.utcDate) > now && !isToday(m.utcDate) && m.homeTeam?.name && m.awayTeam?.name)
      .slice(0, 40);
    const recent = allData
      .filter((m) => m.status === 'FINISHED')
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
      .slice(0, 20);

    renderSchedule(todayGames, 'todayMatches');
    renderSchedule(upcoming, 'upcomingMatches');
    renderSchedule(recent, 'recentMatches');
    document.getElementById('section-today').style.display = todayGames.length ? '' : 'none';

    renderStandings(standingsVal);
    renderScorers(scorersVal);

  } catch (err) {
    console.error('Erro ao carregar dados:', err);
  }
}

// ─── Match Detail Modal ───────────────────────────────────────────────────────
let modalRefreshInterval = null;

function closeModal(e) {
  if (e.target.id === 'matchModal') {
    document.getElementById('matchModal').classList.remove('show');
    if (modalRefreshInterval) { clearInterval(modalRefreshInterval); modalRefreshInterval = null; }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.modal__close')?.addEventListener('click', () => {
    if (modalRefreshInterval) { clearInterval(modalRefreshInterval); modalRefreshInterval = null; }
  });
});

async function openMatchModal(matchId) {
  const modal = document.getElementById('matchModal');
  const content = document.getElementById('modalContent');
  modal.classList.add('show');

  if (modalRefreshInterval) { clearInterval(modalRefreshInterval); modalRefreshInterval = null; }

  const cached = matchCache[matchId];
  if (!cached) {
    content.innerHTML = '<div class="modal-loading">Carregando detalhes...</div>';
  } else {
    content.innerHTML = buildModalHead(cached) + '<div class="modal-loading md-loading-events">Carregando eventos...</div>';
  }

  try {
    const home = cached?.homeTeam?.name || '';
    const away = cached?.awayTeam?.name || '';
    const date = cached?.utcDate || '';
    const events = await fetchAPI(
      `/api/match-events?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}&date=${encodeURIComponent(date)}`
    );
    const m = cached || {};
    const goals = events.goals || [];
    const bookings = events.bookings || [];
    const subs = events.substitutions || [];
    const homeName = (m.homeTeam?.name || '').toLowerCase();
    const awayName = (m.awayTeam?.name || '').toLowerCase();
    const normalize = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
    const isHome = (e) => {
      const t = normalize(e.team?.name || '');
      const hWords = homeName.split(' ').map(normalize).filter(w => w.length > 2);
      const aWords = awayName.split(' ').map(normalize).filter(w => w.length > 2);
      const hScore = hWords.filter(w => t.includes(w)).length;
      const aScore = aWords.filter(w => t.includes(w)).length;
      return hScore >= aScore;
    };

    const homeGoals    = goals.filter(isHome);
    const awayGoals    = goals.filter((g) => !isHome(g));
    const homeBookings = bookings.filter(isHome);
    const awayBookings = bookings.filter((b) => !isHome(b));
    const homeSubs     = subs.filter(isHome);
    const awaySubs     = subs.filter((s) => !isHome(s));
    const homeYellow   = homeBookings.filter((b) => b.card === 'YELLOW_CARD').length;
    const homeRed      = homeBookings.filter((b) => b.card === 'RED_CARD').length;
    const awayYellow   = awayBookings.filter((b) => b.card === 'YELLOW_CARD').length;
    const awayRed      = awayBookings.filter((b) => b.card === 'RED_CARD').length;

    function goalItem(g) {
      const extra = g.type === 'PENALTY' ? ' (P)' : g.type === 'OWN_GOAL' ? ' (CG)' : '';
      return `<div class="mg-item">
        <span class="mg-name">${g.scorer?.name || 'Gol'}${extra}</span>
        <span class="mg-min">${g.minute}'</span>
        ${g.assist?.name ? `<span class="mg-assist">Ass: ${g.assist.name}</span>` : ''}
      </div>`;
    }

    content.innerHTML = buildModalHead(m) + `
      ${goals.length ? `
      <div class="md-section">
        <div class="md-section-title">⚽ Gols</div>
        <div class="md-goals">
          <div class="md-goals-col">${homeGoals.map(goalItem).join('') || '<span class="md-none">—</span>'}</div>
          <div class="md-goals-sep"></div>
          <div class="md-goals-col md-goals-col--away">${awayGoals.map(goalItem).join('') || '<span class="md-none">—</span>'}</div>
        </div>
      </div>` : ''}

      ${bookings.length ? `
      <div class="md-section">
        <div class="md-section-title">🟨 Cartões</div>
        <div class="md-cards-summary">
          <div class="md-cards-team">
            <span>${homeYellow > 0 ? `🟨 ×${homeYellow}` : ''} ${homeRed > 0 ? `🟥 ×${homeRed}` : ''}</span>
            <div class="md-cards-list">${homeBookings.map((b) => `
              <div class="md-card-item">
                <span>${b.card === 'RED_CARD' ? '🟥' : '🟨'}</span>
                <span class="md-card-player">${b.player?.name || '—'}</span>
                <span class="md-card-min">${b.minute}'</span>
              </div>`).join('')}
            </div>
          </div>
          <div class="md-cards-team md-cards-team--away">
            <span>${awayYellow > 0 ? `🟨 ×${awayYellow}` : ''} ${awayRed > 0 ? `🟥 ×${awayRed}` : ''}</span>
            <div class="md-cards-list">${awayBookings.map((b) => `
              <div class="md-card-item">
                <span>${b.card === 'RED_CARD' ? '🟥' : '🟨'}</span>
                <span class="md-card-player">${b.player?.name || '—'}</span>
                <span class="md-card-min">${b.minute}'</span>
              </div>`).join('')}
            </div>
          </div>
        </div>
      </div>` : ''}

      ${subs.length ? `
      <div class="md-section">
        <div class="md-section-title">🔄 Substituições</div>
        <div class="md-subs">
          <div class="md-subs-col">
            ${homeSubs.map((s) => `<div class="md-sub-item">
              <span class="md-sub-min">${s.minute}'</span>
              <span class="md-sub-in">▲ ${s.playerIn?.name || '—'}</span>
              <span class="md-sub-out">▼ ${s.playerOut?.name || '—'}</span>
            </div>`).join('')}
          </div>
          <div class="md-subs-col md-subs-col--away">
            ${awaySubs.map((s) => `<div class="md-sub-item">
              <span class="md-sub-min">${s.minute}'</span>
              <span class="md-sub-in">▲ ${s.playerIn?.name || '—'}</span>
              <span class="md-sub-out">▼ ${s.playerOut?.name || '—'}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>` : ''}
    `;
  } catch (err) {
    const base = cached ? buildModalHead(cached) : '';
    content.innerHTML = base + `<div class="md-empty">Não foi possível carregar os eventos</div>`;
  }

  // Auto-refresh every 30s if match is live
  const isLive = cached?.status === 'IN_PLAY' || cached?.status === 'PAUSED';
  if (isLive) {
    modalRefreshInterval = setInterval(() => {
      if (document.getElementById('matchModal').classList.contains('show')) {
        openMatchModal(matchId);
      } else {
        clearInterval(modalRefreshInterval);
        modalRefreshInterval = null;
      }
    }, 30000);
  }
}

function buildModalHead(m) {
  const ftH = m.score?.fullTime?.home ?? 0;
  const ftA = m.score?.fullTime?.away ?? 0;
  const htH = m.score?.halfTime?.home;
  const htA = m.score?.halfTime?.away;
  const stage = m.stage ? m.stage.replace(/_/g, ' ') : 'Copa do Mundo 2026';
  const group = m.group ? ` · Grupo ${m.group.replace('GROUP_', '')}` : '';
  const matchIsLive     = m.status === 'IN_PLAY' || m.status === 'PAUSED';
  const matchIsFinished = m.status === 'FINISHED';
  const winner  = matchIsFinished ? m.score?.winner : null;
  const homeWon = winner === 'HOME_TEAM';
  const awayWon = winner === 'AWAY_TEAM';
  const mainRef = m.referees?.find((r) => r.type === 'REFEREE') || m.referees?.[0];
  const minute  = m.minute ? `${m.minute}'` : '';

  return `
    <div class="md-head">
      <div class="md-meta">
        ${matchIsLive
          ? `<span class="md-live-badge"><span class="live-dot"></span> AO VIVO${minute ? ` · ${minute}` : ''} · atualiza em 30s</span>`
          : `${formatDate(m.utcDate)}${group} · ${stage}`}
      </div>
      <div class="md-scoreboard">
        <div class="md-team ${homeWon ? 'md-team--winner' : ''}">
          <img class="md-crest" src="${m.homeTeam.crest}" alt="" onerror="this.style.display='none'" />
          <span class="md-tla">${m.homeTeam.tla}</span>
          <span class="md-fullname">${m.homeTeam.shortName || m.homeTeam.name}</span>
        </div>
        <div class="md-center">
          <div class="md-ft">${ftH} : ${ftA}</div>
          ${htH !== null && htH !== undefined ? `<div class="md-ht">Intervalo ${htH} : ${htA}</div>` : ''}
          ${m.score?.duration === 'EXTRA_TIME' ? `<div class="md-ht">Prorrogação</div>` : ''}
          ${m.score?.duration === 'PENALTY_SHOOTOUT' ? `<div class="md-ht">Pênaltis</div>` : ''}
        </div>
        <div class="md-team md-team--away ${awayWon ? 'md-team--winner' : ''}">
          <img class="md-crest" src="${m.awayTeam.crest}" alt="" onerror="this.style.display='none'" />
          <span class="md-tla">${m.awayTeam.tla}</span>
          <span class="md-fullname">${m.awayTeam.shortName || m.awayTeam.name}</span>
        </div>
      </div>
    </div>
    <div class="md-info-grid">
      <div class="md-info-item">
        <span class="md-info-label">Rodada</span>
        <span class="md-info-value">Rodada ${m.matchday}</span>
      </div>
      ${m.venue ? `<div class="md-info-item">
        <span class="md-info-label">Estádio</span>
        <span class="md-info-value">📍 ${m.venue}</span>
      </div>` : ''}
      ${mainRef ? `<div class="md-info-item">
        <span class="md-info-label">Árbitro</span>
        <span class="md-info-value">${mainRef.name}${mainRef.nationality ? ` (${mainRef.nationality})` : ''}</span>
      </div>` : ''}
      ${matchIsFinished ? `<div class="md-info-item">
        <span class="md-info-label">Resultado</span>
        <span class="md-info-value">${winner === 'HOME_TEAM' ? `Vitória ${m.homeTeam.tla}` : winner === 'AWAY_TEAM' ? `Vitória ${m.awayTeam.tla}` : 'Empate'}</span>
      </div>` : ''}
    </div>`;
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
