import fs from 'fs';

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/bg-transparent\/(\d+)/g, 'bg-black/$1');
fs.writeFileSync('src/App.tsx', app);

let player = fs.readFileSync('src/components/Player.tsx', 'utf8');
player = player.replace(/bg-transparent\/(\d+)/g, 'bg-black/$1');
fs.writeFileSync('src/components/Player.tsx', player);
