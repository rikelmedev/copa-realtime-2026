CREATE TABLE IF NOT EXISTS eventos (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  match_id VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS estatisticas_partida (
  match_id VARCHAR(50) PRIMARY KEY,
  gols_time_a INT DEFAULT 0,
  gols_time_b INT DEFAULT 0,
  posse_time_a DECIMAL(5,2) DEFAULT 50.00,
  posse_time_b DECIMAL(5,2) DEFAULT 50.00,
  chutes_time_a INT DEFAULT 0,
  chutes_time_b INT DEFAULT 0,
  cartoes_amarelos_a INT DEFAULT 0,
  cartoes_amarelos_b INT DEFAULT 0,
  cartoes_vermelhos_a INT DEFAULT 0,
  cartoes_vermelhos_b INT DEFAULT 0,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_match_id ON eventos(match_id);
CREATE INDEX IF NOT EXISTS idx_eventos_type ON eventos(type);
CREATE INDEX IF NOT EXISTS idx_eventos_timestamp ON eventos(timestamp);
