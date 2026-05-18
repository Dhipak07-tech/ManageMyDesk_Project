import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
console.log("--- SEARCHING FRONTEND FOR TICKET ACTIVITIES / TIMELINE ---");
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes('ticket_activities') || content.includes('/activities') || content.includes('history')) {
    console.log(`Found in: ${file}`);
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('/api/tickets') || line.includes('activities') || line.includes('history')) {
        console.log(`  L${idx + 1}: ${line.trim()}`);
      }
    });
  }
});
