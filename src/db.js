import Database from 'better-sqlite3';

function initDatabase(filePath = './database.sqlite') {
  return new Database(filePath);
}

function createTable(db, tableName, schema) {
  db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`);
}


function insertData(db, tableName, data) {
  const columns = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).fill('?').join(', ');
  const values = Object.values(data);
  const stmt = db.prepare(`INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`);
  return stmt.run(...values);
}


function getAll(db, tableName) {
  return db.prepare(`SELECT * FROM ${tableName}`).all();
}


function getById(db, tableName, id) {
  return db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`).get(id);
}


function deleteData(db, tableName, id) {
  return db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).run(id);
}

export { initDatabase, createTable, insertData, getAll, getById, deleteData };