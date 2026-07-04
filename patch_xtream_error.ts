import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `) : xtreamError ? (
             <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 mt-4 flex flex-col items-center">
               <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm break-words mb-4">{xtreamError}</div>
               {isRouteAdmin && isAdmin && (
                 <button onClick={clearXtreamConfig} className="px-4 py-2 font-bold text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">
                   Clear Xtream Config
                 </button>
               )}
             </motion.div>
          ) :`;

const replacementStr = `) : xtreamError ? (
             <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 mt-4 flex flex-col items-center max-w-lg mx-auto">
               <div className="w-full bg-red-500/5 border border-red-500/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl relative overflow-hidden text-center">
                 <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                    <X className="w-6 h-6 text-red-400" />
                 </div>
                 <h3 className="text-red-400 font-bold tracking-wide mb-2">Connection Failed</h3>
                 <div className="text-slate-400 text-sm break-words mb-6 leading-relaxed">{xtreamError}</div>
                 {isRouteAdmin && isAdmin && (
                   <button onClick={clearXtreamConfig} className="w-full sm:w-auto px-6 py-2.5 font-semibold text-white bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all hover:scale-105 active:scale-95 text-sm">
                     Clear Settings
                   </button>
                 )}
               </div>
             </motion.div>
          ) :`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync('src/App.tsx', content);
    console.log("Patched xtreamError");
} else {
    console.log("Could not find xtreamError target");
}

