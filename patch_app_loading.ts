import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const loader1Target = `{loadingVod ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mb-4" />
                <p className="text-sm">Loading M3U VOD Library...</p>
              </motion.div>
            ) :`;

const loader1Replacement = `{loadingVod ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full">
                <div className="relative flex items-center justify-center mb-4">
                  <div className="absolute inset-0 border-2 border-white/5 rounded-full w-10 h-10 blur-[1px]"></div>
                  <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent border-l-transparent rounded-full shadow-[0_0_15px_rgba(20,184,166,0.3)]" />
                </div>
                <p className="text-[10px] tracking-widest uppercase font-semibold text-primary animate-pulse">Loading M3U VOD</p>
              </motion.div>
            ) :`;

const loader2Target = `{isLoadingVod && ((vodType === 'movies' && movies.length === 0) || (vodType === 'series' && seriesList.length === 0)) ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mb-4" />
              <p className="text-sm">Loading {vodType === 'movies' ? 'Movie Library' : 'TV Series'}...</p>
            </motion.div>
          ) :`;

const loader2Replacement = `{isLoadingVod && ((vodType === 'movies' && movies.length === 0) || (vodType === 'series' && seriesList.length === 0)) ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full">
              <div className="relative flex items-center justify-center mb-4">
                  <div className="absolute inset-0 border-2 border-white/5 rounded-full w-10 h-10 blur-[1px]"></div>
                  <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent border-l-transparent rounded-full shadow-[0_0_15px_rgba(20,184,166,0.3)]" />
              </div>
              <p className="text-[10px] tracking-widest uppercase font-semibold text-primary animate-pulse">Loading {vodType === 'movies' ? 'Movie Library' : 'TV Series'}</p>
            </motion.div>
          ) :`;

const loader3Target = `{loading ? (
                       <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 text-center text-sm text-slate-500 flex flex-col items-center gap-3">
                         <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                         Loading channels...
                       </motion.div>
                    ) :`;

const loader3Replacement = `{loading ? (
                       <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-4">
                         <div className="relative flex items-center justify-center">
                           <div className="absolute inset-0 border-[2px] border-white/5 rounded-full w-8 h-8 blur-[1px]"></div>
                           <div className="animate-spin w-8 h-8 border-[2px] border-primary border-t-transparent border-l-transparent rounded-full shadow-[0_0_10px_rgba(20,184,166,0.3)]" />
                         </div>
                         <span className="text-[10px] tracking-widest uppercase font-semibold text-primary animate-pulse">Loading</span>
                       </motion.div>
                    ) :`;

const loader4Target = `{loading ? (
                             <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2"><div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />Loading...</motion.div>
                          ) :`;

const loader4Replacement = `{loading ? (
                             <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-4">
                                <div className="relative flex items-center justify-center">
                                  <div className="absolute inset-0 border-[2px] border-white/5 rounded-full w-8 h-8 blur-[1px]"></div>
                                  <div className="animate-spin w-8 h-8 border-[2px] border-primary border-t-transparent border-l-transparent rounded-full shadow-[0_0_10px_rgba(20,184,166,0.3)]" />
                                </div>
                                <span className="text-[10px] tracking-widest uppercase font-semibold text-primary animate-pulse">Loading</span>
                             </motion.div>
                          ) :`;

if (content.includes(loader1Target)) {
    content = content.replace(loader1Target, loader1Replacement);
    console.log("Patched loader 1");
} else { console.log("Could not find loader 1"); }

if (content.includes(loader2Target)) {
    content = content.replace(loader2Target, loader2Replacement);
    console.log("Patched loader 2");
} else { console.log("Could not find loader 2"); }

if (content.includes(loader3Target)) {
    content = content.replace(loader3Target, loader3Replacement);
    console.log("Patched loader 3");
} else { console.log("Could not find loader 3"); }

if (content.includes(loader4Target)) {
    content = content.replace(loader4Target, loader4Replacement);
    console.log("Patched loader 4");
} else { console.log("Could not find loader 4"); }

fs.writeFileSync('src/App.tsx', content);

