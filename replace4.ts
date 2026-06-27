import fs from 'fs';

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/border-white\/10\/80/g, 'border-white/10');
app = app.replace(/bg-transparent\/60/g, 'bg-black/60');
fs.writeFileSync('src/App.tsx', app);

let player = fs.readFileSync('src/components/Player.tsx', 'utf8');
player = player.replace(/border-white\/10\/80/g, 'border-white/10');
player = player.replace(/bg-transparent\/60/g, 'bg-black/60');
fs.writeFileSync('src/components/Player.tsx', player);
