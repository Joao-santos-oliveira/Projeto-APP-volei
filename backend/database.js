/**
 * database.js — PostgreSQL (via node-postgres / pg)
 * Persistência real e permanente — não depende do disco local do servidor,
 * então sobrevive a deploys, restarts e "sono" por inatividade no Render.
 *
 * Requer a variável de ambiente DATABASE_URL (ex: Neon, Supabase, Render Postgres).
 */
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

if (!process.env.DATABASE_URL) {
  console.error('❌ Variável de ambiente DATABASE_URL não definida. Configure-a com a connection string do seu Postgres.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false
});

// ── Schema ────────────────────────────────────────────────────
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      TEXT    NOT NULL UNIQUE,
    display_name  TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    avatar_color  TEXT    DEFAULT '#f5c518',
    is_admin      INTEGER DEFAULT 0,
    created_at    TEXT    DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
  CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (LOWER(username));

  CREATE TABLE IF NOT EXISTS players (
    id          SERIAL PRIMARY KEY,
    name        TEXT    NOT NULL,
    nickname    TEXT,
    number      INTEGER,
    photo       TEXT,
    height      INTEGER,
    primary_position    TEXT NOT NULL DEFAULT 'Ponteiro',
    secondary_positions TEXT DEFAULT '[]',
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TEXT    DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
    updated_at  TEXT    DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );

  CREATE TABLE IF NOT EXISTS player_attributes (
    id            SERIAL PRIMARY KEY,
    player_id     INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    attack        REAL    DEFAULT 5,
    serve         REAL    DEFAULT 5,
    reception     REAL    DEFAULT 5,
    block         REAL    DEFAULT 5,
    defense       REAL    DEFAULT 5,
    setting       REAL    DEFAULT 5,
    communication REAL    DEFAULT 5,
    consistency   REAL    DEFAULT 5,
    versatility   REAL    DEFAULT 5,
    recorded_at   TEXT    DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );

  CREATE TABLE IF NOT EXISTS player_ratings (
    id            SERIAL PRIMARY KEY,
    player_id     INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    user_id       INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    attack        REAL    DEFAULT 5,
    serve         REAL    DEFAULT 5,
    reception     REAL    DEFAULT 5,
    block         REAL    DEFAULT 5,
    defense       REAL    DEFAULT 5,
    setting       REAL    DEFAULT 5,
    communication REAL    DEFAULT 5,
    consistency   REAL    DEFAULT 5,
    versatility   REAL    DEFAULT 5,
    updated_at    TEXT    DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
    UNIQUE(player_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS player_observations (
    id          SERIAL PRIMARY KEY,
    player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    text        TEXT    NOT NULL,
    created_at  TEXT    DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );

  CREATE TABLE IF NOT EXISTS teams (
    id          SERIAL PRIMARY KEY,
    name        TEXT    NOT NULL,
    description TEXT    DEFAULT '',
    color       TEXT    DEFAULT '#f5c518',
    photo       TEXT,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TEXT    DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
    updated_at  TEXT    DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );

  CREATE TABLE IF NOT EXISTS team_players (
    team_id     INTEGER NOT NULL REFERENCES teams(id)   ON DELETE CASCADE,
    player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, player_id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id          SERIAL PRIMARY KEY,
    date        DATE    DEFAULT CURRENT_DATE,
    home_team   TEXT    DEFAULT 'Equipe A',
    away_team   TEXT    DEFAULT 'Equipe B',
    status      TEXT    DEFAULT 'setup',
    max_sets    INTEGER DEFAULT 5,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TEXT    DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );

  CREATE TABLE IF NOT EXISTS match_players (
    match_id    INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team        TEXT    NOT NULL DEFAULT 'home',
    PRIMARY KEY (match_id, player_id)
  );

  CREATE TABLE IF NOT EXISTS sets (
    id          SERIAL PRIMARY KEY,
    match_id    INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    set_number  INTEGER NOT NULL,
    home_score  INTEGER DEFAULT 0,
    away_score  INTEGER DEFAULT 0,
    winner      TEXT,
    finished    INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS points (
    id                  SERIAL PRIMARY KEY,
    match_id            INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    set_id              INTEGER NOT NULL REFERENCES sets(id)    ON DELETE CASCADE,
    player_id           INTEGER REFERENCES players(id),
    team                TEXT    NOT NULL,
    action              TEXT    NOT NULL,
    home_score_after    INTEGER NOT NULL,
    away_score_after    INTEGER NOT NULL,
    timestamp           TEXT    DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
`;

// ── Seed ─────────────────────────────────────────────────────
async function seedAdmin() {
  const { rows } = await pool.query("SELECT id FROM users WHERE LOWER(username) = 'admin'");
  if (rows.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.query(
      `INSERT INTO users (username, display_name, password_hash, avatar_color, is_admin)
       VALUES ('admin', 'Admin', $1, '#f5c518', 1)`,
      [hash]
    );
    console.log('✅ Usuário admin criado (senha: admin123) — troque essa senha depois do primeiro login.');
  }
}

// ── Helper: converte placeholders estilo SQLite (?) para Postgres ($1, $2...) ─
function toPgQuery(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// ── API ──────────────────────────────────────────────────────
async function query(sql, params = []) {
  const res = await pool.query(toPgQuery(sql), params);
  return res.rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function run(sql, params = []) {
  const res = await pool.query(toPgQuery(sql), params);
  const id = res.rows[0]?.id ?? null; // exige RETURNING id nos INSERTs que precisam do id gerado
  return { lastInsertRowid: id, rowCount: res.rowCount };
}

// ── Inicialização ─────────────────────────────────────────────
async function initDatabase() {
  await pool.query(SCHEMA);
  await seedAdmin();
  console.log('🗄️  Banco Postgres pronto e conectado.');
  return { query, queryOne, run };
}

module.exports = { initDatabase, getDb: () => ({ query, queryOne, run }) };
