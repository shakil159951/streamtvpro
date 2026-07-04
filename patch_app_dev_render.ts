import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const regexImg = /src="https:\/\/api\.dicebear\.com\/7\.x\/lorelei\/svg\?seed=Farabi&backgroundColor=0d9488"/g;
content = content.replace(regexImg, 'src={devPhoto}');

const regexName = /<h2 className="font-black text-lg sm:text-xl tracking-wide text-slate-50 uppercase drop-shadow-\[0_2px_10px_rgba\(20,184,166,0\.5\)\]">FARABI AHMED<br\/>SHAKIL<\/h2>/g;
content = content.replace(regexName, '<h2 className="font-black text-lg sm:text-xl tracking-wide text-slate-50 uppercase drop-shadow-[0_2px_10px_rgba(20,184,166,0.5)] whitespace-pre-line">{devName.replace(/\\\\n/g, \'\\n\')}</h2>');

const regexFbUrl = /href="https:\/\/www\.facebook\.com\/farabiahmedshakil11"/g;
content = content.replace(regexFbUrl, 'href={devFbUrl}');

const regexFbHandle = /<div className="text-\[10px\] sm:text-xs text-slate-400">farabiahmedshakil11<\/div>/g;
content = content.replace(regexFbHandle, '<div className="text-[10px] sm:text-xs text-slate-400">{devFbHandle}</div>');

const regexTgUrl = /href="https:\/\/t\.me\/farabiSH"/g;
content = content.replace(regexTgUrl, 'href={devTgUrl}');

const regexTgHandle = /<div className="text-\[10px\] sm:text-xs text-slate-400">@farabiSH<\/div>/g;
content = content.replace(regexTgHandle, '<div className="text-[10px] sm:text-xs text-slate-400">{devTgHandle}</div>');

fs.writeFileSync('src/App.tsx', content);
console.log("Patched render in App.tsx");
