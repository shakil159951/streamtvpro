import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /className=\{`flex-1 min-w-\[70px\] flex flex-col items-center gap-1\.5 p-2 rounded-lg text-\[10px\] sm:text-xs font-semibold transition-colors \$\{activeTab === 'channels' \? 'bg-white\/10 text-teal-400' : 'text-slate-400 hover:bg-white\/5 hover:text-white'\}`\}/g,
  "className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2 rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-300 ${activeTab === 'channels' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}"
);

content = content.replace(
  /className=\{`flex-1 min-w-\[70px\] flex flex-col items-center gap-1\.5 p-2 rounded-lg text-\[10px\] sm:text-xs font-semibold transition-colors \$\{activeTab === 'vod' \? 'bg-white\/10 text-teal-400' : 'text-slate-400 hover:bg-white\/5 hover:text-white'\}`\}/g,
  "className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2 rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-300 ${activeTab === 'vod' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}"
);

content = content.replace(
  /className=\{`flex-1 min-w-\[60px\] flex flex-col items-center gap-1\.5 p-2 rounded-lg text-\[10px\] sm:text-xs font-semibold transition-colors \$\{activeTab === 'dev' \? 'bg-white\/10 text-teal-400' : 'text-slate-400 hover:bg-white\/5 hover:text-white'\}`\}/g,
  "className={`flex-1 min-w-[60px] flex flex-col items-center gap-1.5 p-2 rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-300 ${activeTab === 'dev' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}"
);

content = content.replace(
  /className=\{`flex-1 min-w-\[60px\] flex flex-col items-center gap-1\.5 p-2 rounded-lg text-\[10px\] sm:text-xs font-semibold transition-colors \$\{activeTab === 'lists' \? 'bg-white\/10 text-teal-400' : 'text-slate-400 hover:bg-white\/5 hover:text-white'\}`\}/g,
  "className={`flex-1 min-w-[60px] flex flex-col items-center gap-1.5 p-2 rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-300 ${activeTab === 'lists' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}"
);

content = content.replace(
  /className=\{`flex-1 min-w-\[60px\] flex flex-col items-center gap-1\.5 p-2 rounded-lg text-\[10px\] sm:text-xs font-semibold transition-colors \$\{activeTab === 'setup' \? 'bg-white\/10 text-teal-400' : 'text-slate-400 hover:bg-white\/5 hover:text-white'\}`\}/g,
  "className={`flex-1 min-w-[60px] flex flex-col items-center gap-1.5 p-2 rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-300 ${activeTab === 'setup' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}"
);


fs.writeFileSync('src/App.tsx', content);
