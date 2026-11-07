import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

let db: Database.Database | null = null;
let openedPath: string | null = null;

export function getDbPath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'nimba.sqlite');
}

export function getDb(): Database.Database {
  const dbPath = getDbPath();
  if (db && openedPath === dbPath) return db;
  if (db) db.close();

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  openedPath = dbPath;
  return db;
}

export function closeDb(): void {
  if (!db) return;
  db.close();
  db = null;
  openedPath = null;
}

export function resetDatabase(): void {
  const dbPath = getDbPath();
  closeDb();
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(dbPath + suffix, { force: true });
  }
}

function migrate(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY,
      number TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      pricePerNight INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'maintenance'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY,
      roomId INTEGER NOT NULL REFERENCES rooms(id),
      guestName TEXT NOT NULL,
      phone TEXT NOT NULL,
      checkIn TEXT NOT NULL,
      checkOut TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(roomId);
  `);
}
