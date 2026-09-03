const https = require('https');

const API_KEY = process.env.FOOTBALL_API_KEY;
const DEFAULT_COMPETITION = parseInt(process.env.COMPETITION_ID || '2001', 10);

const COMPETITIONS = [
  { id: 2001, name: 'Champions League', short: 'UCL' },
  { id: 2002, name: 'Europa League',    short: 'UEL' },
  { id: 2021, name: 'Premier League',   short: 'PL'  },
  { id: 2013, name: 'Brasileirão',      short: 'BSA' },
  { id: 2152, name: 'Libertadores',     short: 'CLI' },
];

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.football-data.org',
      path: `/v4${path}`,
      headers: { 'X-Auth-Token': API_KEY },
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Erro ao parsear resposta da API'));
        }
      });
    }).on('error', reject);
  });
}

async function getLiveMatches(competitionId = DEFAULT_COMPETITION) {
  const data = await get(`/competitions/${competitionId}/matches?status=LIVE`);
  return data.matches || [];
}

async function getMatch(matchId) {
  const data = await get(`/matches/${matchId}`);
  return data;
}

function normalizeMatch(match) {
  return {
    matchId: String(match.id),
    teamA: {
      code: match.homeTeam.tla,
      name: match.homeTeam.shortName || match.homeTeam.name,
    },
    teamB: {
      code: match.awayTeam.tla,
      name: match.awayTeam.shortName || match.awayTeam.name,
    },
    score: {
      a: match.score.fullTime.home ?? match.score.halfTime.home ?? 0,
      b: match.score.fullTime.away ?? match.score.halfTime.away ?? 0,
    },
    minute: match.minute || 0,
    status: match.status,
    venue: match.venue || 'A definir',
    referees: match.referees?.map((r) => r.name).join(', ') || '',
  };
}

async function getUpcomingMatches(limit = 20, competitionId = DEFAULT_COMPETITION) {
  const data = await get(`/competitions/${competitionId}/matches?status=SCHEDULED`);
  return (data.matches || []).slice(0, limit);
}

async function getStandings(competitionId = DEFAULT_COMPETITION) {
  const data = await get(`/competitions/${competitionId}/standings`);
  return data.standings || [];
}

async function getScorers(limit = 20, competitionId = DEFAULT_COMPETITION) {
  const data = await get(`/competitions/${competitionId}/scorers?limit=${limit}`);
  return data.scorers || [];
}

async function getAllMatches(competitionId = DEFAULT_COMPETITION) {
  const data = await get(`/competitions/${competitionId}/matches`);
  return data.matches || [];
}

module.exports = {
  getLiveMatches, getMatch, normalizeMatch,
  getUpcomingMatches, getStandings, getScorers, getAllMatches,
  COMPETITIONS,
};
