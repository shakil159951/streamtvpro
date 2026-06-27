import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Movies & Series tabs styling
content = content.replace(
  /className=\{`flex-1 py-2 text-xs font-bold rounded-lg transition-colors \$\{vodType === 'movies' \? 'bg-white\/10 text-teal-400' : 'text-slate-400 hover:bg-white\/5 hover:text-white'\}`\}/g,
  "className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${vodType === 'movies' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}"
);

content = content.replace(
  /className=\{`flex-1 py-2 text-xs font-bold rounded-lg transition-colors \$\{vodType === 'series' \? 'bg-white\/10 text-teal-400' : 'text-slate-400 hover:bg-white\/5 hover:text-white'\}`\}/g,
  "className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${vodType === 'series' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}"
);

fs.writeFileSync('src/App.tsx', content);
