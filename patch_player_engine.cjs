const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

const engineSelectorHtml = `
                    <div className="flex items-center bg-slate-900/90 backdrop-blur-md rounded-full border border-slate-700 p-1 shadow-lg pointer-events-auto">
                        {['Default', 'Video.js', 'Shaka', 'dash.js', 'Clappr'].map(eng => {
                            let btnClass = 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white';
                            if (engine === eng) {
                                btnClass = 'bg-[#52d869] text-black shadow-md';
                            }
                            
                            return (
                                <button
                                    key={eng}
                                    onClick={(e) => { e.stopPropagation(); setEngine(eng as any); }}
                                    className={\`px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-full transition-all \${btnClass}\`}
                                >
                                    {eng}
                                </button>
                            );
                        })}
                    </div>`;

code = code.replace(
    /<div className="flex flex-col items-end gap-2">\s*<div className="flex items-center gap-2">/g,
    `<div className="flex flex-col items-end gap-2">\n${engineSelectorHtml}\n                    <div className="flex items-center gap-2">`
);

fs.writeFileSync('src/components/Player.tsx', code);
