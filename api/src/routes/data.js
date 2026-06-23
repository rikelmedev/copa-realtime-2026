const router = require('express').Router();
const {
  getLiveMatches,
  getUpcomingMatches,
  getStandings,
  getScorers,
  getAllMatches,
  normalizeMatch,
} = require('../services/football-data');

router.get('/live', async (req, res) => {
  try {
    const matches = await getLiveMatches();
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/upcoming', async (req, res) => {
  try {
    const matches = await getUpcomingMatches();
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/matches', async (req, res) => {
  try {
    const matches = await getAllMatches();
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/standings', async (req, res) => {
  try {
    const standings = await getStandings();
    res.json(standings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/scorers', async (req, res) => {
  try {
    const scorers = await getScorers();
    res.json(scorers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
