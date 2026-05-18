import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./timesheet.sqlite');

db.all("SELECT * FROM ticket_activities ORDER BY id DESC LIMIT 5", [], (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log("--- RECENT TICKET ACTIVITIES ---");
  rows.forEach(row => {
    console.log(`Ticket: ${row.ticket_id} | Type: ${row.activity_type} | Message: ${row.message}`);
  });
});
