import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Improve hover effects
content = content.replace(/hover:scale-105 active:scale-95/g, 'hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black');
content = content.replace(/hover:bg-slate-800\/50/g, 'hover:bg-slate-800/80 focus:bg-slate-800/80 focus-visible:ring-2 focus-visible:ring-primary outline-none');

fs.writeFileSync('src/App.tsx', content);

let playerContent = fs.readFileSync('src/components/Player.tsx', 'utf8');
playerContent = playerContent.replace(/hover:scale-105 active:scale-95/g, 'hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black');
fs.writeFileSync('src/components/Player.tsx', playerContent);

console.log('Fixed UI Animations');

