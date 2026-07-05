const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

// Change default engine to Video.js
code = code.replace(
    /const \[engine, setEngine\] = useState<'Default' \| 'Shaka' \| 'Clappr' \| 'dash.js' \| 'Video.js'>\('Default'\);/,
    "const [engine, setEngine] = useState<'Default' | 'Shaka' | 'Clappr' | 'dash.js' | 'Video.js'>('Video.js');"
);

// Remove the engine select UI
code = code.replace(
    /<div className="flex items-center bg-slate-900\/90 backdrop-blur-md rounded-full border border-slate-700 p-1 shadow-lg pointer-events-auto">\s*\{\['Default', 'Video.js', 'Shaka', 'dash.js', 'Clappr'\]\.map\(eng => \{\s*let btnClass = 'bg-white\/10 text-slate-300 hover:bg-white\/20 hover:text-white';\s*if \(engine === eng\) \{\s*btnClass = 'bg-\[\#52d869\] text-black shadow-md';\s*\}\s*return \(\s*<button\s*key=\{eng\}\s*onClick=\{\(e\) => \{ e\.stopPropagation\(\); setEngine\(eng as any\); \}\}\s*className=\{`px-2 py-1 sm:px-3 sm:py-1\.5 text-\[10px\] sm:text-xs font-medium rounded-full transition-all \$\{btnClass\}`\}\s*>\s*\{eng\}\s*<\/button>\s*\);\s*\}\)\}\s*<\/div>/g,
    ""
);

// Remove the loading screen
code = code.replace(
    /\{loading && \(\s*<div className="absolute inset-0 flex flex-col items-center justify-center bg-black\/60 backdrop-blur-md z-30 pointer-events-none transition-all duration-500">\s*<div className="relative flex items-center justify-center mb-6">\s*<div className="absolute inset-0 border-\[3px\] border-white\/5 rounded-full w-16 h-16 blur-\[1px\]"><\/div>\s*<div className="animate-spin w-16 h-16 border-\[3px\] border-primary border-t-transparent border-l-transparent rounded-full shadow-\[0_0_20px_rgba\(20,184,166,0\.4\)\]" \/>\s*<div className="absolute inset-0 flex items-center justify-center">\s*<div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-\[0_0_10px_rgba\(20,184,166,0\.8\)\]" \/>\s*<\/div>\s*<\/div>\s*<h3 className="text-white\/80 font-medium tracking-\[0\.3em\] uppercase text-xs animate-pulse">Initializing<\/h3>\s*<\/div>\s*\)\}/g,
    ""
);

fs.writeFileSync('src/components/Player.tsx', code);
