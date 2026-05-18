import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./timesheet.sqlite');

db.all("SELECT * FROM users", [], (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(`--- FOUND ${rows.length} USERS IN SQLITE ---`);
  rows.forEach(row => {
    console.log(`ID: ${row.id} | UID: ${row.uid} | Name: ${row.name} | Email: ${row.email}`);
  });
});
