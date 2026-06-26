const { getLiveMatches, getMatch, normalizeMatch } = require('../services/football-data');
const { publisher } = require('../config/redis');
const { getChannel } = require('../config/rabbitmq');
const { clearCache } = require('../routes/data');

const INTERVAL_MS = 30000;
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
    publish({ type: 'MATCH_START', matchId, data: fresh, timestamp: new Date().toISOString() });
    return;
  }

  if (fresh.score.a !== prev.score.a) {
    clearCache('live');
    publish({ type: 'GOL', matchId, data: { time: 'A', score: fresh.score }, timestamp: new Date().toISOString() });
  }

  if (fresh.score.b !== prev.score.b) {
    clearCache('live');
    publish({ type: 'GOL', matchId, data: { time: 'B', score: fresh.score }, timestamp: new Date().toISOString() });
  }

  state[matchId] = fresh;
}

async function poll() {
  try {
    const matches = await getLiveMatches();

    if (matches.length === 0) {
      console.log('Poller: nenhuma partida ao vivo no momento.');
      return;
    }

    for (const match of matches) {
      const normalized = normalizeMatch(match);
      detectChanges(normalized.matchId, normalized);
    }
  } catch (err) {
    console.error('Poller erro:', err.message);
  }
}

function startPoller() {
  console.log(`Poller iniciado — verificando a cada ${INTERVAL_MS / 1000}s`);
  poll();
  setInterval(poll, INTERVAL_MS);
}

module.exports = { startPoller };
