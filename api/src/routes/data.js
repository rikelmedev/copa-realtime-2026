const router = require('express').Router();
const {
  getLiveMatches, getUpcomingMatches, getStandings,
  getScorers, getAllMatches, COMPETITIONS,
} = require('../services/football-data');

// ── Cache em memória ──────────────────────────────────────────────────────────
const cache = {};

function getCompetition(req) {
  return parseInt(req.query.competition || COMPETITIONS[0].id, 10);
}

function cached(prefix, ttlMs, fetcher) {
  return async (req, res) => {
    const cid = getCompetition(req);
    const key = `${prefix}-${cid}`;
    const now = Date.now();
    const hit = cache[key];
    if (hit && now - hit.ts < ttlMs) return res.json(hit.data);
    try {
      const data = await fetcher(cid);
      cache[key] = { ts: now, data };
      res.json(data);
    } catch (err) {
      if (hit) return res.json(hit.data);
      res.status(500).json({ error: err.message });
    }
  };
}

const TTL_LIVE      = 30  * 1000;
const TTL_MATCHES   = 90  * 1000;
const TTL_STANDINGS = 120 * 1000;
const TTL_SCORERS   = 300 * 1000;
// ─────────────────────────────────────────────────────────────────────────────

router.get('/competitions', (req, res) => res.json(COMPETITIONS));

router.get('/live',      cached('live',      TTL_LIVE,      (c) => getLiveMatches(c)));
router.get('/matches',   cached('matches',   TTL_MATCHES,   (c) => getAllMatches(c)));
router.get('/standings', cached('standings', TTL_STANDINGS, (c) => getStandings(c)));
router.get('/scorers',   cached('scorers',   TTL_SCORERS,   (c) => getScorers(20, c)));

router.get('/upcoming', async (req, res) => {
  const cid = getCompetition(req);
  try {
    const matches = await getUpcomingMatches(20, cid);
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

function clearCache(prefix) {
  if (prefix) {
    Object.keys(cache).filter((k) => k.startsWith(prefix)).forEach((k) => delete cache[k]);
  } else {
    Object.keys(cache).forEach((k) => delete cache[k]);
  }
}

router.clearCache = clearCache;
module.exports = router;
