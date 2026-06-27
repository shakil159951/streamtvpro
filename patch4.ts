import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The line is at 1264 approximately.
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('))}')) {
    // Only target the one in the mobile list section (after line 1000)
    if (i > 1000 && lines[i-1].includes('</div>') && lines[i-2].includes('</div>') && lines[i-3].includes(')}')) {
       lines.splice(i, 0, '                            )');
       break;
    }
  }
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
