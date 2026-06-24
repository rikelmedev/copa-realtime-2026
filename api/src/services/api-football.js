const https = require('https');

const BASE_HOST = 'v3.football.api-sports.io';
const API_KEY   = process.env.API_FOOTBALL_KEY;
// FIFA World Cup league ID in api-football is 1
const WC_LEAGUE  = process.env.API_FOOTBALL_LEAGUE || 1;
const WC_SEASON  = process.env.API_FOOTBALL_SEASON || 2026;

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_HOST,
      path,
      headers: { 'x-apisports-key': API_KEY },
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Parse error')); }
      });
    }).on('error', reject);
  });
}

// Find the api-football fixture ID by home/away team name and UTC date string
async function findFixtureId(homeTeam, awayTeam, utcDate) {
  const date = utcDate.slice(0, 10); // "2026-06-20"
  const data = await get(`/fixtures?date=${date}&league=${WC_LEAGUE}&season=${WC_SEASON}`);
  const fixtures = data.response || [];

  // Match by team name (case-insensitive, partial match)
  const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '');
  const homeN = normalize(homeTeam);
  const awayN = normalize(awayTeam);

  const match = fixtures.find((f) => {
    const fh = normalize(f.teams?.home?.name);
    const fa = normalize(f.teams?.away?.name);
    return fh.includes(homeN) || homeN.includes(fh) ||
           fa.includes(awayN) || awayN.includes(fa);
  });

  return match ? match.fixture.id : null;
}

async function getFixtureEvents(fixtureId) {
  const data = await get(`/fixtures/events?fixture=${fixtureId}`);
  return data.response || [];
}

// Returns { goals, bookings, substitutions } in football-data.org-compatible shape
async function getMatchEvents(homeTeam, awayTeam, utcDate) {
  const fixtureId = await findFixtureId(homeTeam, awayTeam, utcDate);
  if (!fixtureId) return { goals: [], bookings: [], substitutions: [] };

  const events = await getFixtureEvents(fixtureId);

  const goals = [];
  const bookings = [];
  const substitutions = [];

  for (const e of events) {
    const minute = e.time?.elapsed;
    const teamName = e.team?.name;

    if (e.type === 'Goal') {
      goals.push({
        minute,
        team: { name: teamName },
        scorer: { name: e.player?.name },
        assist: e.assist?.name ? { name: e.assist.name } : null,
        type: e.detail === 'Penalty' ? 'PENALTY'
            : e.detail === 'Own Goal' ? 'OWN_GOAL'
            : 'REGULAR',
      });
    } else if (e.type === 'Card') {
      bookings.push({
        minute,
        team: { name: teamName },
        player: { name: e.player?.name },
        card: e.detail === 'Red Card' || e.detail === 'Second Yellow card'
          ? 'RED_CARD' : 'YELLOW_CARD',
      });
    } else if (e.type === 'subst') {
      substitutions.push({
        minute,
        team: { name: teamName },
        playerOut: { name: e.player?.name },
        playerIn:  { name: e.assist?.name },
      });
    }
  }

  return { goals, bookings, substitutions };
}

module.exports = { getMatchEvents };
