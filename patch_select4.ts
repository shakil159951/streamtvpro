import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Update ChevronDown icons to be more visible
content = content.replace(/text-slate-500 pointer-events-none group-hover:text-teal-400/g, 'text-teal-500/70 pointer-events-none group-hover:text-teal-400');

// Make the select background a bit more obvious as a button (bg-[#1a1a1a] instead of bg-[#111111])
content = content.replace(/bg-\[#111111\] hover:bg-\[#1a1a1a\]/g, 'bg-[#1a1a1a] hover:bg-[#252525]');

fs.writeFileSync('src/App.tsx', content);
