import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { getMatchesData } from './matches-data.js';

let _db = null;

export function getDb() {
  if (!_db) {
    const dbPath = path.join(process.cwd(), 'prode.db');
    _db = new DatabaseSync(dbPath);

    // Auto-disable BigInt so numeric values come back as JS numbers
    const origPrepare = _db.prepare.bind(_db);
    _db.prepare = (sql) => {
      const stmt = origPrepare(sql);
      if (typeof stmt.setReadBigInts === 'function') stmt.setReadBigInts(false);
      return stmt;
    };

    _db.exec('PRAGMA journal_mode = WAL');
    _db.exec('PRAGMA foreign_keys = ON');
    initSchema(_db);
    seedMatches(_db);
  }
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT UNIQUE NOT NULL COLLATE NOCASE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS matches (
      id         INTEGER PRIMARY KEY,
      stage      TEXT NOT NULL,
      group_name TEXT,
      matchday   INTEGER,
      home_team  TEXT NOT NULL DEFAULT 'TBD',
      away_team  TEXT NOT NULL DEFAULT 'TBD',
      match_time TEXT NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      winner     TEXT,
      finished   INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      match_id   INTEGER NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, match_id),
      FOREIGN KEY (user_id)  REFERENCES users(id),
      FOREIGN KEY (match_id) REFERENCES matches(id)
    );

    CREATE TABLE IF NOT EXISTS champion_predictions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER UNIQUE NOT NULL,
      team       TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

function seedMatches(db) {
  const row = db.prepare('SELECT COUNT(*) AS count FROM matches').get();
  if (Number(row.count) === 0) {
    const matches = getMatchesData();
    db.exec('BEGIN');
    try {
      const stmt = db.prepare(`
        INSERT INTO matches (id, stage, group_name, matchday, home_team, away_team, match_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const m of matches) {
        stmt.run(m.id, m.stage, m.group_name ?? null, m.matchday ?? null, m.home_team, m.away_team, m.match_time);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

/** Returns true if predictions for this match are now locked (1 hour before kick-off) */
export function isLocked(matchTime) {
  return Date.now() >= new Date(matchTime).getTime() - 60 * 60 * 1000;
}

/** ISO string of the earliest match — used as the champion-prediction lock anchor */
export function getFirstMatchTime(db) {
  const row = db.prepare('SELECT MIN(match_time) AS min_time FROM matches').get();
  return row?.min_time ?? null;
}

/** Returns the champion team name once the Final has a result, otherwise null */
export function getChampion(db) {
  const final = db.prepare("SELECT * FROM matches WHERE stage = 'final' AND finished = 1").get();
  if (!final) return null;
  if (final.winner === 'home') return final.home_team;
  if (final.winner === 'away') return final.away_team;
  if (Number(final.home_score) > Number(final.away_score)) return final.home_team;
  if (Number(final.away_score) > Number(final.home_score)) return final.away_team;
  return null;
}
