const router = require('express').Router();
const {
  getLiveMatches,
  getUpcomingMatches,
  getStandings,
  getScorers,
  getAllMatches,
  normalizeMatch,
} = require('../services/football-data');

// ── Cache em memória no servidor ──────────────────────────────────────────────
const cache = {};

function cached(key, ttlMs, fetcher) {
  return async (req, res) => {
    const now = Date.now();
    const hit = cache[key];
    if (hit && now - hit.ts < ttlMs) {
      return res.json(hit.data);
    }
    try {
      const data = await fetcher();
      cache[key] = { ts: now, data };
      res.json(data);
    } catch (err) {
      // Se tiver dado em cache (mesmo expirado), serve ele em vez de erro
      if (hit) return res.json(hit.data);
      res.status(500).json({ error: err.message });
    }
  };
}

const TTL_LIVE      = 30  * 1000;  // 30s — jogos ao vivo
const TTL_MATCHES   = 90  * 1000;  // 90s — partidas
const TTL_STANDINGS = 120 * 1000;  // 2min — classificação
const TTL_SCORERS   = 300 * 1000;  // 5min — artilheiros
// ─────────────────────────────────────────────────────────────────────────────

router.get('/live',      cached('live',      TTL_LIVE,      getLiveMatches));
router.get('/matches',   cached('matches',   TTL_MATCHES,   getAllMatches));
router.get('/standings', cached('standings', TTL_STANDINGS, getStandings));
router.get('/scorers',   cached('scorers',   TTL_SCORERS,   getScorers));

router.get('/upcoming', async (req, res) => {
  try {
    const matches = await getUpcomingMatches();
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/matches/:id', async (req, res) => {
  try {
    const { getMatch } = require('../services/football-data');
    const match = await getMatch(req.params.id);
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/match-events', async (req, res) => {
  try {
    const { home, away, date } = req.query;
    if (!home || !away || !date) {
      return res.status(400).json({ error: 'home, away e date são obrigatórios' });
    }
    const { getMatchEvents } = require('../services/api-football');
    const events = await getMatchEvents(home, away, date);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function clearCache(key) {
  if (key) delete cache[key];
  else Object.keys(cache).forEach((k) => delete cache[k]);
}

router.clearCache = clearCache;
module.exports = router;
