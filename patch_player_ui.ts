import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

// 1. Fix setError('') to keep "Auto-switching" message
content = content.replace(
    "    setError('');\n    setIsPlaying(false);",
    "    setError(prev => prev.includes('Auto-switching') ? prev : '');\n    setIsPlaying(false);"
);

// 2. Fix the engine button styling logic
const oldBtnMap = `{['Auto', 'Video.js', 'Shaka', 'dash.js', 'Clappr'].map(eng => {
                            const isSelected = engine === eng;
                            const isAutoActive = engine === 'Auto' && activeEngine === eng;
                            
                            return (
                                <button
                                    key={eng}
                                    onClick={(e) => { e.stopPropagation(); setEngine(eng as any); }}
                                    className={\`px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-full transition-all \${isSelected ? 'bg-[#52d869] text-black shadow-md' : isAutoActive ? 'border border-[#52d869] text-[#52d869] bg-[#52d869]/10' : 'text-slate-400 hover:text-white'}\`}
                                >
                                    {eng}
                                </button>
                            );
                        })}`;

const newBtnMap = `{['Auto', 'Video.js', 'Shaka', 'dash.js', 'Clappr'].map(eng => {
                            let btnClass = 'text-slate-400 hover:text-white';
                            if (engine === 'Auto') {
                                if (eng === 'Auto') {
                                    btnClass = activeEngine === 'Default' ? 'bg-[#52d869] text-black shadow-md' : 'border border-[#52d869] text-[#52d869] bg-[#52d869]/10';
                                } else if (activeEngine === eng) {
                                    btnClass = 'bg-[#52d869] text-black shadow-md';
                                }
                            } else if (engine === eng) {
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
                        })}`;

if (content.includes(oldBtnMap)) {
    content = content.replace(oldBtnMap, newBtnMap);
    console.log("Patched button map");
} else {
    console.log("Could not find button map target string");
}

fs.writeFileSync('src/components/Player.tsx', content);
