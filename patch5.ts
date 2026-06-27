import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add imports
if (!content.includes("import { motion, AnimatePresence } from 'motion/react';")) {
  content = content.replace(
    "import { \n  Tv",
    "import { motion, AnimatePresence } from 'motion/react';\nimport { \n  Tv"
  );
}

// 2. M3U VOD Library Loading
content = content.replace(
  /\{loadingVod \? \(\s*<div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full">\s*<div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mb-4" \/>\s*<p className="text-sm">Loading M3U VOD Library\.\.\.<\/p>\s*<\/div>\s*\) : \(\s*<div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-max h-full">/,
  `<AnimatePresence mode="wait">
          {loadingVod ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full">
              <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mb-4" />
              <p className="text-sm">Loading M3U VOD Library...</p>
            </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-max h-full">`
);

content = content.replace(
  /<\/div>\s*<\/button>\s*\)\)\}\s*<\/div>\s*\)\}/,
  `</div>\n               </button>\n               ))}\n            </motion.div>\n          )}\n          </AnimatePresence>`
);

// 3. Xtream Movie Library Loading
content = content.replace(
  /\{isLoadingVod && \(\(vodType === 'movies' && movies\.length === 0\) \|\| \(vodType === 'series' && seriesList\.length === 0\)\) \? \(\s*<div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full">\s*<div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mb-4" \/>\s*<p className="text-sm">Loading \{vodType === 'movies' \? 'Movie Library' : 'TV Series'\}\.\.\.<\/p>\s*<\/div>\s*\) : xtreamError \? \(/,
  `<AnimatePresence mode="wait">
        {isLoadingVod && ((vodType === 'movies' && movies.length === 0) || (vodType === 'series' && seriesList.length === 0)) ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full">
            <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mb-4" />
            <p className="text-sm">Loading {vodType === 'movies' ? 'Movie Library' : 'TV Series'}...</p>
          </motion.div>
        ) : xtreamError ? (`
);

content = content.replace(
  /<\/div>\s*\{isRouteAdmin && isAdmin && \(\s*<button onClick=\{\(\) => setShowXtreamModal\(true\)\}/,
  `</motion.div>\n             {isRouteAdmin && isAdmin && (\n               <button onClick={() => setShowXtreamModal(true)}`
);

// I need to add motion.div to the grids of xtreamError ? () : ( <div grid... ) 
// Let's use string operations directly

fs.writeFileSync('src/App.tsx', content);
