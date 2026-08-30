/**
 * database.js — SQLite via sql.js (WASM, sem compilação nativa)
 * Persiste o banco no arquivo: ./db/volleyball.db
 */
const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');
const bcrypt    = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'db', 'volleyball.db');
const dbDir   = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

let db; // instância global

// ── Schema ────────────────────────────────────────────────────
const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    display_name  TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    avatar_color  TEXT    DEFAULT '#f5c518',
    is_admin      INTEGER DEFAULT 0,
    created_at    TEXT    DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS players (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    nickname    TEXT,
    number      INTEGER,
    photo       TEXT,
    height      INTEGER,
    primary_position    TEXT NOT NULL DEFAULT 'Ponteiro',
    secondary_positions TEXT DEFAULT '[]',
    created_at  TEXT    DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime')),
    updated_at  TEXT    DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS player_attributes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
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
    recorded_at   TEXT    DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS player_ratings (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
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
    updated_at    TEXT    DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime')),
    UNIQUE(player_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS player_observations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    text        TEXT    NOT NULL,
    created_at  TEXT    DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS teams (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT    DEFAULT '',
    color       TEXT    DEFAULT '#f5c518',
    photo       TEXT,
    created_at  TEXT    DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime')),
    updated_at  TEXT    DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS team_players (
    team_id     INTEGER NOT NULL REFERENCES teams(id)   ON DELETE CASCADE,
    player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    PRIMARY KEY (team_id, player_id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT    DEFAULT (date('now','localtime')),
    home_team   TEXT    DEFAULT 'Equipe A',
    away_team   TEXT    DEFAULT 'Equipe B',
    status      TEXT    DEFAULT 'setup',
    max_sets    INTEGER DEFAULT 5,
    created_at  TEXT    DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS match_players (
    match_id    INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team        TEXT    NOT NULL DEFAULT 'home',
    PRIMARY KEY (match_id, player_id)
  );

  CREATE TABLE IF NOT EXISTS sets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id    INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    set_number  INTEGER NOT NULL,
    home_score  INTEGER DEFAULT 0,
    away_score  INTEGER DEFAULT 0,
    winner      TEXT,
    finished    INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS points (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id            INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    set_id              INTEGER NOT NULL REFERENCES sets(id)    ON DELETE CASCADE,
    player_id           INTEGER REFERENCES players(id),
    team                TEXT    NOT NULL,
    action              TEXT    NOT NULL,
    home_score_after    INTEGER NOT NULL,
    away_score_after    INTEGER NOT NULL,
    timestamp           TEXT    DEFAULT (strftime('%Y-%m-%d %H:%M:%S','now','localtime'))
  );
`;

// ── Seed ─────────────────────────────────────────────────────
function seedPlayers() {
  // Garante apenas o usuário admin padrão
  const adminRow = db.exec("SELECT id FROM users WHERE username = 'admin'")[0]?.values[0];
  if (!adminRow) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run(
      `INSERT INTO users (username, display_name, password_hash, avatar_color, is_admin)
       VALUES ('admin', 'Admin', ?, '#f5c518', 1)`,
      [hash]
    );
    console.log('✅ Usuário admin criado (senha: admin123)');
  }
}

// ── Salvar banco em disco ─────────────────────────────────────
function saveToDisk() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ── Helper: rows → objects ────────────────────────────────────
function rowsToObjects(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function firstRow(result) {
  return rowsToObjects(result)[0] || null;
}

// ── API simplificada ──────────────────────────────────────────
function query(sql, params = []) {
  return rowsToObjects(db.exec(sql, params));
}

function queryOne(sql, params = []) {
  return firstRow(db.exec(sql, params));
}

function run(sql, params = []) {
  db.run(sql, params);
  const lastId = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
  saveToDisk();
  return { lastInsertRowid: lastId };
}

// ── Inicialização ─────────────────────────────────────────────
async function initDatabase() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  db.run(SCHEMA);
  saveToDisk();
  seedPlayers();
  saveToDisk();
  console.log('🗄️  Banco SQLite pronto:', DB_PATH);
  return { query, queryOne, run, db };
}

module.exports = { initDatabase, getDb: () => ({ query, queryOne, run }) };
