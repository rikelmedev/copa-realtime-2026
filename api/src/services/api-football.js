const https = require('https');

const ESPN_HOST = 'site.api.espn.com';
const ESPN_BASE = '/apis/site/v2/sports/soccer/fifa.world';

function get(host, path) {
  return new Promise((resolve, reject) => {
    https.get({ hostname: host, path }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Parse error')); }
      });
    }).on('error', reject);
  });
}

// ESPN uses dates in format YYYYMMDD (US timezone offset)
// We try the UTC date and also the day before to handle timezone gaps
function dateStr(utcDate, offsetDays = 0) {
  const d = new Date(utcDate);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

async function findEspnEventId(homeTeam, awayTeam, utcDate) {
  const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '');
  const homeN = normalize(homeTeam);
  const awayN = normalize(awayTeam);

  // Try the UTC date and the day before (ESPN uses US timezone)
  const dates = [dateStr(utcDate, 0), dateStr(utcDate, -1)];

  for (const date of dates) {
    const data = await get(ESPN_HOST, `${ESPN_BASE}/scoreboard?dates=${date}`);
    const events = data.events || [];

    const match = events.find((e) => {
      const comps = e.competitions?.[0]?.competitors || [];
      return comps.some((c) => {
        const name = normalize(c.team?.displayName || c.team?.name || '');
        return name.includes(homeN.slice(0, 5)) || homeN.includes(name.slice(0, 5)) ||
               name.includes(awayN.slice(0, 5)) || awayN.includes(name.slice(0, 5));
      });
    });

    if (match) return match.id;
  }

  return null;
}

async function getMatchEvents(homeTeam, awayTeam, utcDate) {
  const eventId = await findEspnEventId(homeTeam, awayTeam, utcDate);
  if (!eventId) return { goals: [], bookings: [], substitutions: [] };

  const data = await get(ESPN_HOST, `${ESPN_BASE}/summary?event=${eventId}`);
  const keyEvents = data.keyEvents || [];

  const goals = [];
  const bookings = [];
  const substitutions = [];

  for (const e of keyEvents) {
    const type = e.type?.type;
    const minute = Math.floor((e.clock?.value || 0) / 60) || null;
    const displayMin = e.clock?.displayValue || (minute ? `${minute}'` : '—');
    const teamName = e.team?.displayName || '';
    const participants = e.participants || [];

    if (type === 'goal') {
      const detail = (e.text || '').toLowerCase();
      goals.push({
        minute: displayMin.replace("'", ''),
        team: { name: teamName },
        scorer: { name: participants[0]?.athlete?.displayName || '—' },
        assist: null,
        type: detail.includes('penalty') ? 'PENALTY'
            : detail.includes('own goal') ? 'OWN_GOAL'
            : 'REGULAR',
        description: e.text || '',
      });
    } else if (type === 'yellow-card' || type === 'red-card' || type === 'yellow-red-card') {
      bookings.push({
        minute: displayMin.replace("'", ''),
        team: { name: teamName },
        player: { name: participants[0]?.athlete?.displayName || '—' },
        card: type === 'red-card' || type === 'yellow-red-card' ? 'RED_CARD' : 'YELLOW_CARD',
      });
    } else if (type === 'substitution') {
      substitutions.push({
        minute: displayMin.replace("'", ''),
        team: { name: teamName },
        playerIn:  { name: participants[0]?.athlete?.displayName || '—' },
        playerOut: { name: participants[1]?.athlete?.displayName || '—' },
      });
    }
  }

  return { goals, bookings, substitutions };
}

module.exports = { getMatchEvents };
