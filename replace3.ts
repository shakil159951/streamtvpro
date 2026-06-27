import fs from 'fs';

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/hover:glass-button/g, 'hover:bg-white/10');
app = app.replace(/bg-transparent\/80/g, 'bg-black/80'); // some manual fixing
app = app.replace(/glass-card\/60/g, 'bg-black/60 glass-card');
fs.writeFileSync('src/App.tsx', app);

let player = fs.readFileSync('src/components/Player.tsx', 'utf8');
player = player.replace(/hover:glass-button/g, 'hover:bg-white/10');
player = player.replace(/glass-card\/60/g, 'bg-black/60 glass-card');
player = player.replace(/glass-card\/95/g, 'bg-black/80 glass-card');
fs.writeFileSync('src/components/Player.tsx', player);
