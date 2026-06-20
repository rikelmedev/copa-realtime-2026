const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function processEvent(event) {
  const { type, matchId, data, timestamp } = event;

  await pool.query(
    'INSERT INTO eventos (type, match_id, data, timestamp) VALUES ($1, $2, $3, $4)',
    [type, matchId, data, timestamp]
  );

  await pool.query(
    `INSERT INTO estatisticas_partida (match_id) VALUES ($1)
     ON CONFLICT (match_id) DO NOTHING`,
    [matchId]
  );

  switch (type) {
    case 'GOL':
      const colGol = data.time === 'A' ? 'gols_time_a' : 'gols_time_b';
      await pool.query(
        `UPDATE estatisticas_partida SET ${colGol} = ${colGol} + 1, atualizado_em = NOW() WHERE match_id = $1`,
        [matchId]
      );
      break;

    case 'POSSE':
      await pool.query(
        `UPDATE estatisticas_partida
         SET posse_time_a = $1, posse_time_b = $2, atualizado_em = NOW()
         WHERE match_id = $3`,
        [data.timeA, data.timeB, matchId]
      );
      break;

    case 'CHUTE':
      const colChute = data.time === 'A' ? 'chutes_time_a' : 'chutes_time_b';
      await pool.query(
        `UPDATE estatisticas_partida SET ${colChute} = ${colChute} + 1, atualizado_em = NOW() WHERE match_id = $1`,
        [matchId]
      );
      break;

    case 'CARTAO_AMARELO':
      const colAmarelo = data.time === 'A' ? 'cartoes_amarelos_a' : 'cartoes_amarelos_b';
      await pool.query(
        `UPDATE estatisticas_partida SET ${colAmarelo} = ${colAmarelo} + 1, atualizado_em = NOW() WHERE match_id = $1`,
        [matchId]
      );
      break;

    case 'CARTAO_VERMELHO':
      const colVermelho = data.time === 'A' ? 'cartoes_vermelhos_a' : 'cartoes_vermelhos_b';
      await pool.query(
        `UPDATE estatisticas_partida SET ${colVermelho} = ${colVermelho} + 1, atualizado_em = NOW() WHERE match_id = $1`,
        [matchId]
      );
      break;

    default:
      console.log(`Tipo de evento não mapeado: ${type}`);
  }
}

module.exports = { processEvent };
