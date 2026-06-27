import fs from 'fs';

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/teal-500/g, 'primary');
app = app.replace(/teal-400/g, 'primary');
app = app.replace(/teal-600/g, 'primary');
app = app.replace(/bg-\[\#0a0a0a\]/g, 'bg-transparent');
app = app.replace(/bg-black/g, 'bg-transparent');
app = app.replace(/bg-slate-900/g, 'glass-card');
app = app.replace(/bg-slate-800/g, 'glass-button');
app = app.replace(/border-slate-800/g, 'border-white/5');
app = app.replace(/border-slate-700/g, 'border-white/10');
app = app.replace(/text-slate-400/g, 'text-slate-400'); // unchanged
fs.writeFileSync('src/App.tsx', app);

let player = fs.readFileSync('src/components/Player.tsx', 'utf8');
player = player.replace(/teal-500/g, 'primary');
player = player.replace(/teal-400/g, 'primary');
player = player.replace(/bg-\[\#0a0a0a\]/g, 'bg-transparent');
player = player.replace(/bg-black/g, 'bg-transparent');
player = player.replace(/bg-slate-900/g, 'glass-card');
fs.writeFileSync('src/components/Player.tsx', player);
