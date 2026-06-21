const https = require('https');

const BASE_URL = process.env.FOOTBALL_API_URL || 'https://api.football-data.org/v4';
const API_KEY = process.env.FOOTBALL_API_KEY;

const COMPETITION_ID = 2000; // FIFA World Cup

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

async function getLiveMatches() {
  const data = await get(`/competitions/${COMPETITION_ID}/matches?status=LIVE`);
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

module.exports = { getLiveMatches, getMatch, normalizeMatch };
