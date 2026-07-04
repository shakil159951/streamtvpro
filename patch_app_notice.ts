import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `{showNotice && (
        <div className="flex items-center justify-between bg-primary/10 border-b border-primary/20 px-4 py-2 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-amber-500/5 backdrop-blur-md" />
          <div className="flex-1 overflow-hidden whitespace-nowrap z-10 flex text-xs sm:text-sm">
            <div className="animate-marquee inline-block text-teal-50/90 font-medium tracking-wide">
              <span className="text-amber-500 font-bold mr-3 uppercase tracking-widest text-[10px] sm:text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">NOTICE</span>
              {appNotice}
            </div>
          </div>
          <button onClick={() => setShowNotice(false)} className="ml-4 p-1.5 hover:bg-white/10 rounded-full z-10 text-slate-400 hover:text-white transition-colors glass-card/50 backdrop-blur-md">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}`;

const replacementStr = `{showNotice && (
        <div className="flex items-center justify-between bg-black/60 border-b border-white/5 px-4 py-2.5 relative overflow-hidden shrink-0 backdrop-blur-xl shadow-sm z-40">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5" />
          <div className="flex-1 overflow-hidden whitespace-nowrap z-10 flex items-center text-xs sm:text-sm">
            <div className="animate-marquee inline-block text-slate-300 font-medium tracking-wide">
              <span className="text-primary font-bold mr-3 uppercase tracking-widest text-[10px] sm:text-xs bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 shadow-inner inline-flex items-center gap-1.5 align-middle">
                <Info className="w-3.5 h-3.5" />
                Update
              </span>
              <span className="align-middle">{appNotice}</span>
            </div>
          </div>
          <button onClick={() => setShowNotice(false)} className="ml-4 p-1.5 hover:bg-white/10 rounded-full z-10 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync('src/App.tsx', content);
    console.log("Patched App.tsx notice");
} else {
    console.log("Could not find App.tsx notice");
}
