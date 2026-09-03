const { getLiveMatches, normalizeMatch, COMPETITIONS } = require('../services/football-data');
const { publisher } = require('../config/redis');
const { getChannel } = require('../config/rabbitmq');
const { clearCache } = require('../routes/data');

const INTERVAL_MS = 30000;
const POLL_DELAY_MS = 2000; // delay entre competições para respeitar rate limit
const state = {};

function publish(event) {
  publisher.publish('eventos_copa', JSON.stringify(event));
  const channel = getChannel();
  if (channel) {
    channel.sendToQueue('estatisticas_fila', Buffer.from(JSON.stringify(event)), { persistent: true });
  }
}

function detectChanges(matchId, fresh) {
  const prev = state[matchId];

  if (!prev) {
    state[matchId] = fresh;
    clearCache('live');
    publish({ type: 'MATCH_START', matchId, data: fresh, timestamp: new Date().toISOString() });
    return;
  }

  if (fresh.score.a !== prev.score.a) {
    clearCache('live');
    publish({ type: 'GOL', matchId, data: { time: 'A', team: fresh.teamA.name, score: fresh.score, minute: fresh.minute }, timestamp: new Date().toISOString() });
  }

  if (fresh.score.b !== prev.score.b) {
    clearCache('live');
    publish({ type: 'GOL', matchId, data: { time: 'B', team: fresh.teamB.name, score: fresh.score, minute: fresh.minute }, timestamp: new Date().toISOString() });
  }

  state[matchId] = fresh;
}

async function pollCompetition(comp) {
  try {
    const matches = await getLiveMatches(comp.id);
    if (!matches.length) return;
    for (const match of matches) {
      const normalized = normalizeMatch(match);
      detectChanges(normalized.matchId, normalized);
    }
  } catch (err) {
    console.error(`Poller erro (${comp.short}):`, err.message);
  }
}

async function poll() {
  for (const comp of COMPETITIONS) {
    await pollCompetition(comp);
    await new Promise((r) => setTimeout(r, POLL_DELAY_MS));
  }
}

function startPoller() {
  console.log(`Poller iniciado — ${COMPETITIONS.length} competições, intervalo ${INTERVAL_MS / 1000}s`);
  poll();
  setInterval(poll, INTERVAL_MS);
}

module.exports = { startPoller };
