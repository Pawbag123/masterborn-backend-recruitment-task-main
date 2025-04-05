import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

export const setupDb = async () => {
  const db = await open({
    filename: process.env.DATABASE_FILE || './database.sqlite',
    // filename: ":memory:",
    driver: sqlite3.Database,
  });

  await db.migrate();

  return db;
};
